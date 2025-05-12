import { Injectable, ConflictException, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, TokenPayloadDto } from './dto/auth.dto';
import { UserSettingsDto } from './dto/update-settings.dto';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';

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
    await this.prisma.user.create({ 
      data: { 
        username: dto.username, 
        email: dto.email, 
        password_hash: hash 
        // role и isBlocked будут установлены по умолчанию из схемы Prisma
      } 
    });
  }

  async validateUser(username: string, pass: string): Promise<Omit<User, 'password_hash'> | null> {
    const user: User | null = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return null;

    if (user.isBlocked) {
      throw new UnauthorizedException('Ваш аккаунт заблокирован.');
    }

    const ok = await bcrypt.compare(pass, user.password_hash);
    if (!ok) return null;
    const { password_hash, ...res } = user;
    return res;
  }

  async login(user: Omit<User, 'password_hash'>) {
    const payload: TokenPayloadDto = { sub: user.id, username: user.username, role: user.role }; 
    try {
        const token = this.jwt.sign(payload);
        return { access_token: token, user };
    } catch (error) {
        throw new UnauthorizedException('Could not generate authentication token.'); 
    }
  }

  async getProfile(userId: number): Promise<Partial<User>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, dailyGoal: true, created_at: true, role: true, isBlocked: true }, 
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateSettings(userId: number, dto: UserSettingsDto): Promise<Partial<User>> {
    const dataToUpdate: Partial<User> = {};
    if (dto.dailyGoal !== undefined) dataToUpdate.dailyGoal = dto.dailyGoal;
    
    const updatedUser = await this.prisma.user.update({ 
      where: { id: userId }, 
      data: dataToUpdate as any,
      select: { id: true, username: true, email: true, dailyGoal: true, created_at: true, role: true, isBlocked: true } 
    });
    return updatedUser;
  }

  async getAllUsers(requestingUserRole: UserRole): Promise<Partial<User>[]> {
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied.');
    }
    return this.prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, isBlocked: true, created_at: true, dailyGoal: true }
    });
  }

  async getOneUser(id: number, requestingUserRole: UserRole): Promise<Partial<User> | null> {
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, username: true, email: true, role: true, isBlocked: true, 
        created_at: true, dailyGoal: true, modules: {select: {id: true, title: true}}, 
        lastStreakUpdate: true, currentStreak: true, maxStreak: true 
      }
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async blockUser(id: number, requestingUserRole: UserRole): Promise<Partial<User>> {
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied.');
    }
    const userToBlock = await this.prisma.user.findUnique({ where: { id } });
    if (!userToBlock) throw new NotFoundException('User to block not found');
    if (userToBlock.role === UserRole.ADMIN) throw new ForbiddenException('Cannot block an admin.');

    return this.prisma.user.update({
      where: { id },
      data: { isBlocked: true },
      select: { id: true, username: true, email: true, role: true, isBlocked: true, created_at: true, dailyGoal: true }
    });
  }

  async unblockUser(id: number, requestingUserRole: UserRole): Promise<Partial<User>> {
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied.');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isBlocked: false },
      select: { id: true, username: true, email: true, role: true, isBlocked: true, created_at: true, dailyGoal: true }
    });
  }
}
