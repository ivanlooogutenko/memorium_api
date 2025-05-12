import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ModulesService } from './modules.service';
import { ModuleDto } from './dto/module.dto';
import { LanguageDto } from './dto/language.dto';
import { UserRole } from '@prisma/client';

@ApiTags('modules')
@Controller('modules')
export class ModulesController {
  constructor(private readonly service: ModulesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить все модули текущего пользователя' })
  getAll(@Request() req) {
    return this.service.getAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить модуль по ID (текущего пользователя)' })
  @ApiParam({ name: 'id', description: 'ID модуля' })
  getById(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать модуль для текущего пользователя' })
  create(@Request() req, @Body() dto: ModuleDto) {
    return this.service.create(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить модуль текущего пользователя' })
  @ApiParam({ name: 'id', description: 'ID модуля' })
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() dto: ModuleDto) {
    return this.service.update(id, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить модуль текущего пользователя' })
  @ApiParam({ name: 'id', description: 'ID модуля' })
  delete(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id, req.user.id);
  }

  @Get('languages/all')
  @ApiOperation({ summary: 'Получить список доступных языков' })
  @ApiResponse({ status: 200, description: 'Список языков', type: [LanguageDto] })
  async getLanguages() {
    return this.service.getLanguages();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/users/:userId/modules')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Получить все модули указанного пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя, чьи модули нужно получить', type: Number })
  @ApiResponse({ status: 200, description: 'Список модулей пользователя' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async getModulesByUserIdForAdmin(
    @Request() req,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ) {
    return this.service.getModulesByUserIdForAdmin(targetUserId, req.user.role as UserRole);
  }
}