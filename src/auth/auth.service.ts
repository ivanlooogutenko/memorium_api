import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, TokenPayloadDto } from './dto/auth.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ access_token: string }> {
        const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: registerDto.username },
          { email: registerDto.email },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === registerDto.username) {
        throw new ConflictException('Имя пользователя уже занято');
      }
      if (existingUser.email === registerDto.email) {
        throw new ConflictException('Email уже используется');
      }
    }

        const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

        const user = await this.prisma.user.create({
      data: {
        username: registerDto.username,
        email: registerDto.email,
        password_hash: hashedPassword,
        interface_language_id: registerDto.interface_language_id,
      },
    });

        const payload: TokenPayloadDto = { 
      sub: user.id, 
      username: user.username 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(username: string, password: string): Promise<any> {
    console.log(`[AuthService] Validating user: ${username}`);
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.log(`[AuthService] User not found: ${username}`);
      return null;
    }

    console.log(`[AuthService] User found: ${username}. Comparing passwords...`);
    const isPasswordMatching = await bcrypt.compare(password, user.password_hash);
    console.log(`[AuthService] Password matching result for ${username}: ${isPasswordMatching}`);

    if (isPasswordMatching) {
      const { password_hash, ...result } = user;
      console.log(`[AuthService] User validation successful: ${username}`);
      return result;
    }
    
    console.log(`[AuthService] User validation failed (password mismatch): ${username}`);
    return null;
  }

  async login(user: any): Promise<{ access_token: string; user: any }> {
    console.log(`[AuthService] Entering login method for user: ${user.username}`);
    const payload: TokenPayloadDto = { 
      sub: user.id, 
      username: user.username 
    };
    
    try {
      const accessToken = this.jwtService.sign(payload);
      console.log(`[AuthService] JWT generated successfully for user: ${user.username}`);
      return {
        access_token: accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          interface_language_id: user.interface_language_id,
        },
      };
    } catch (error) {
      console.error(`[AuthService] Error during JWT signing for user: ${user.username}`, error);
      throw new UnauthorizedException('Ошибка при генерации токена доступа');
    }
  }

  async getUserProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        interface_language_id: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return user;
  }

  async updateUserSettings(userId: number, updateSettingsDto: UpdateSettingsDto): Promise<Omit<User, 'password_hash'>> {
    console.log(`[AuthService] Updating settings for user ID: ${userId}`, updateSettingsDto);
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(updateSettingsDto.dailyGoal !== undefined && { dailyGoal: updateSettingsDto.dailyGoal }),
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...result } = updatedUser;
      console.log(`[AuthService] User settings updated successfully for user ID: ${userId}`);
      return result;
    } catch (error) {
      console.error(`[AuthService] Error updating settings for user ID: ${userId}`, error);
      throw new Error('Не удалось обновить настройки пользователя.');
    }
  }
}
