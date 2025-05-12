import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client'; // Исправляем на UserRole
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // Если роли не указаны, доступ разрешен
    }
    const { user } = context.switchToHttp().getRequest();
    // Важно: Убедитесь, что ваш JwtStrategy добавляет объект user с полем role в request
    // Например, user: { id: number, username: string, role: Role }
    return requiredRoles.some((role) => user.role?.includes(role));
  }
} 