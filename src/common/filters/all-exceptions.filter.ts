import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
      error: HttpStatus[status],
      message: 'Internal Server Error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      const data = typeof resp === 'string' ? { message: resp } : (resp as any);
      body = {
        ...body,
        statusCode: status,
        error: data.error || exception.name,
        message: data.message || exception.message,
        details: data.details,
      };
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError
    ) {
      status = HttpStatus.CONFLICT;
      let msg = exception.message;
      let err = exception.code;

      switch (exception.code) {
        case 'P2002':
          msg = `Уникальное поле нарушено: ${(exception.meta?.target as string[]).join(', ')}`;
          err = 'UniqueConstraint';
          status = HttpStatus.CONFLICT;
          break;
        case 'P2003':
          msg = 'Внешний ключ не найден';
          err = 'ForeignKeyViolation';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2001':
        case 'P2018':
          msg = 'Запись не найдена';
          err = 'NotFound';
          status = HttpStatus.NOT_FOUND;
          break;
      }

      body = {
        ...body,
        statusCode: status,
        error: err,
        message: msg,
        details: { code: exception.code, meta: exception.meta },
      };
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      body = {
        ...body,
        statusCode: status,
        error: 'ValidationError',
        message: exception.message,
      };
    }

    this.logger.error(
      `${req.method} ${req.url} -> ${body.statusCode} ${body.error}: ${body.message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    res.status(body.statusCode).json(body);
  }
}