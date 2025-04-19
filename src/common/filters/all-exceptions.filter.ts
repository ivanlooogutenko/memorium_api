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
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Внутренняя ошибка сервера';
    let error = 'Internal Server Error';
    let details: any = null;

    // Handle HttpExceptions (NestJS built-in exceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        const exceptionResponseObj = exceptionResponse as any;
        message = exceptionResponseObj.message || message;
        error = exceptionResponseObj.error || exception.name;
        details = exceptionResponseObj.details || null;
      } else {
        message = exceptionResponse as string;
        error = exception.name;
      }
    } 
    // Handle Prisma exceptions
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle unique constraint violations
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const field = exception.meta?.target as string[];
        message = `Значение поля ${field?.join(', ')} уже существует`;
        error = 'Conflict';
      } 
      // Handle foreign key constraint violations
      else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Ссылка на несуществующую запись';
        error = 'Foreign Key Constraint Violation';
      }
      // Handle record not found
      else if (exception.code === 'P2001' || exception.code === 'P2018') {
        status = HttpStatus.NOT_FOUND;
        message = 'Запись не найдена';
        error = 'Not Found';
      }
      details = {
        code: exception.code,
        meta: exception.meta,
      };
    } 
    // Handle Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Ошибка валидации данных';
      error = 'Validation Error';
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : 'No stack trace',
    );

    // Return standardized error response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
      details,
    });
  }
} 