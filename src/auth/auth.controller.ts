import { Controller, Request, Post, UseGuards, Body, Get, HttpCode, HttpStatus, UnauthorizedException, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь успешно зарегистрирован' })
  @ApiResponse({ status: 409, description: 'Пользователь с таким именем или email уже существует' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Получение профиля пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  @ApiResponse({ status: 401, description: 'Неавторизованный доступ' })
  getProfile(@Request() req) {
    console.log('[AuthController] Getting profile for user ID from req.user:', req.user?.id);
    if (req.user?.id === undefined || req.user?.id === null) {
        console.error('[AuthController] User ID not found in req.user for getProfile');
        throw new UnauthorizedException('Не удалось идентифицировать пользователя из токена');
    }
    return this.authService.getUserProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile/settings')
  @ApiOperation({ summary: 'Обновление настроек пользователя' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Настройки успешно обновлены' })
  @ApiResponse({ status: 401, description: 'Неавторизованный доступ' })
  @ApiResponse({ status: 400, description: 'Неверные данные в запросе' })
  @ApiBody({ type: UpdateSettingsDto })
  async updateSettings(@Request() req, @Body() updateSettingsDto: UpdateSettingsDto) {
    console.log('[AuthController] Updating settings for user ID from req.user:', req.user?.id);
    if (req.user?.id === undefined || req.user?.id === null) {
      console.error('[AuthController] User ID not found in req.user for updateSettings');
      throw new UnauthorizedException('Не удалось идентифицировать пользователя из токена');
    }
    return this.authService.updateUserSettings(req.user.id, updateSettingsDto);
  }
}
