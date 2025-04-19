import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        message,
        error: 'Business Rule Violation',
        statusCode,
      },
      statusCode,
    );
  }
}

export class EntityNotFoundException extends HttpException {
  constructor(entity: string, id?: string | number) {
    const message = id 
      ? `${entity} с ID ${id} не найден` 
      : `${entity} не найден`;
    
    super(
      {
        message,
        error: 'Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DuplicateEntityException extends HttpException {
  constructor(entity: string, field: string, value: string) {
    super(
      {
        message: `${entity} с ${field} "${value}" уже существует`,
        error: 'Conflict',
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidOperationException extends HttpException {
  constructor(message: string) {
    super(
      {
        message,
        error: 'Invalid Operation',
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
} 