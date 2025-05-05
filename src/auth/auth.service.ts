import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, TokenPayloadDto } from './dto/auth.dto';
import { UserSettingsDto } from './dto/update-settings.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    const exists = await this.prisma.user.findFirst({ where: { OR: [ { username: dto.username }, { email: dto.email } ] } });
    if (exists) {
      if (exists.username === dto.username) throw new ConflictException('Username is taken');
      throw new ConflictException('Email is used');
    }
    const hash = await bcrypt.hash(dto.password, await bcrypt.genSalt());
    await this.prisma.user.create({ data: { username: dto.username, email: dto.email, password_hash: hash } });
  }

  async validateUser(username: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return null;
    const ok = await bcrypt.compare(pass, user.password_hash);
    if (!ok) return null;
    const { password_hash, ...res } = user;
    return res;
  }

  async login(user: any) {
    const payload: TokenPayloadDto = { sub: user.id, username: user.username };
    try {
        const token = this.jwt.sign(payload);
        return { access_token: token, user };
    } catch (error) {
        throw new UnauthorizedException('Could not generate authentication token.'); 
    }
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, dailyGoal: true, created_at: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateSettings(userId: number, dto: UserSettingsDto) {
    const data: any = {};
    if (dto.dailyGoal !== undefined) data.dailyGoal = dto.dailyGoal;
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    const { password_hash, ...res } = user;
    return res;
  }
}
