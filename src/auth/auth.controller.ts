import { Controller, Post, Body, UseGuards, Request, Get, Put, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserSettingsDto } from './dto/update-settings.dto';

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
}