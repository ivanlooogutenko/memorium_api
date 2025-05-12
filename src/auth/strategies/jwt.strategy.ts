import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenPayloadDto } from '../dto/auth.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'memorium-secret-key',
    });
  }

  async validate(payload: TokenPayloadDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        dailyGoal: true,
        role: true,
        isBlocked: true,
      },
    });
    if (!user || user.isBlocked) {
      throw new UnauthorizedException('Неверный токен или пользователь заблокирован.');
    }
    return { id: user.id, username: user.username, role: user.role };
  }
}