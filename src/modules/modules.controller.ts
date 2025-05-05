import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModulesService } from './modules.service';
import { ModuleDto } from './dto/module.dto';
import { LanguageDto } from './dto/language.dto';

@ApiTags('modules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules')
export class ModulesController {
  constructor(private readonly service: ModulesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все модули' })
  getAll(@Request() req) {
    return this.service.getAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить модуль по ID' })
  @ApiParam({ name: 'id', description: 'ID модуля' })
  getById(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать модуль' })
  create(@Request() req, @Body() dto: ModuleDto) {
    return this.service.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить модуль' })
  @ApiParam({ name: 'id', description: 'ID модуля' })
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() dto: ModuleDto) {
    return this.service.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить модуль' })
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
}