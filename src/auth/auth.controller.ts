import { Controller, Post, Body, UseGuards, Request, Get, Put, HttpCode, HttpStatus, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserSettingsDto } from './dto/update-settings.dto';
import { UserRole } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация' })
  @ApiResponse({ status: 201, description: 'OK' })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход' })
  @ApiBody({ type: LoginDto })
  async login(@Request() req) {
    return this.auth.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль' })
  async profile(@Request() req) {
    return this.auth.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile/settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить настройки' })
  async updateSettings(@Request() req, @Body() dto: UserSettingsDto) {
    return this.auth.updateSettings(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/users')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Получить всех пользователей' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  async getAllUsers(@Request() req) {
    return this.auth.getAllUsers(req.user.role as UserRole);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/users/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Получить пользователя по ID' })
  @ApiParam({ name: 'id', description: 'ID пользователя', type: Number })
  @ApiResponse({ status: 200, description: 'Информация о пользователе' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async getOneUser(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.auth.getOneUser(id, req.user.role as UserRole);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/users/:id/block')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Заблокировать пользователя' })
  @ApiParam({ name: 'id', description: 'ID пользователя', type: Number })
  @ApiResponse({ status: 200, description: 'Пользователь заблокирован' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async blockUser(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.auth.blockUser(id, req.user.role as UserRole);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/users/:id/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Разблокировать пользователя' })
  @ApiParam({ name: 'id', description: 'ID пользователя', type: Number })
  @ApiResponse({ status: 200, description: 'Пользователь разблокирован' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async unblockUser(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.auth.unblockUser(id, req.user.role as UserRole);
  }
}