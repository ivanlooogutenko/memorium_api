import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRole } from '@prisma/client'; // Убеждаемся, что импорт корректный

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Пользователь добавляется в request через JwtAuthGuard

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступ разрешен только администраторам.');
    }
    return true;
  }
} 