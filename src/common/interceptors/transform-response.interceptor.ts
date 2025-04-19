import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: any;
  statusCode: number;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
                if (data && data.statusCode && data.message && data.timestamp) {
          return data;
        }

                if (data && data.success && data.message) {
          return {
            statusCode,
            message: data.message,
            data: data,
            timestamp: new Date().toISOString(),
          };
        }

                return {
          statusCode,
          message: 'Операция выполнена успешно',
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
} 