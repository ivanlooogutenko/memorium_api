import { HttpException, HttpStatus } from '@nestjs/common';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: any;
}

export abstract class AppException extends HttpException {
  constructor(
    response: Partial<ErrorResponse>,
    status: HttpStatus,
  ) {
    super(
      {
        statusCode: status,
        error: response.error ?? HttpStatus[status],
        message: response.message ?? HttpStatus[status],
        details: response.details,
      },
      status,
    );
  }
}

export class BusinessRuleViolationException extends AppException {
  constructor(message: string) {
    super({
      message,
      error: 'BusinessRuleViolation',
    }, HttpStatus.BAD_REQUEST);
  }
}

export class EntityNotFoundException extends AppException {
  constructor(entity: string, id?: string | number) {
    const msg = id
      ? `${entity} с ID ${id} не найден`
      : `${entity} не найден`;
    super({
      message: msg,
      error: 'NotFound',
    }, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateEntityException extends AppException {
  constructor(entity: string, field: string, value: string) {
    super({
      message: `${entity} с ${field} "${value}" уже существует`,
      error: 'Conflict',
    }, HttpStatus.CONFLICT);
  }
}

export class InvalidOperationException extends AppException {
  constructor(message: string) {
    super({
      message,
      error: 'InvalidOperation',
    }, HttpStatus.BAD_REQUEST);
  }
}