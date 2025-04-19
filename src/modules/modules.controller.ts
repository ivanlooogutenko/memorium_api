import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ForbiddenException
} from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModuleDto } from './dto/module.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';



@ApiTags('modules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules')
export class ModulesController {

  constructor(private readonly modulesService: ModulesService) {}



  @ApiOperation({ summary: 'Получить все модули текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Список всех модулей пользователя' })
  @Get()
  getAllModules(@Request() req) {
    return this.modulesService.getModulesByUser(req.user.id);
  }



  @ApiOperation({ summary: 'Получить модули по ID пользователя (только для администраторов)' })
  @ApiParam({ name: 'userId', description: 'ID пользователя', required: true })
  @ApiResponse({ status: 200, description: 'Список модулей пользователя' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  @Get('user/:userId')
  getModulesByUser(
    @Request() req,
    @Param('userId', ParseIntPipe) userId: number
  ) {
            if (req.user.id !== userId) {
      return this.modulesService.getModulesByUser(req.user.id);
    }
    return this.modulesService.getModulesByUser(userId);
  }



  @ApiOperation({ summary: 'Получить модуль по ID' })
  @ApiParam({ name: 'id', description: 'ID модуля', required: true })
  @ApiResponse({ status: 200, description: 'Данные модуля' })
  @ApiResponse({ status: 404, description: 'Модуль не найден' })
  @Get(':id')
  getModuleById(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.modulesService.getModuleById(id, req.user.id);
  }



  @ApiOperation({ summary: 'Получить статистику модуля' })
  @ApiParam({ name: 'id', description: 'ID модуля', required: true })
  @ApiResponse({ status: 200, description: 'Статистика модуля' })
  @ApiResponse({ status: 404, description: 'Модуль не найден' })
  @Get(':id/stats')
  getModuleStats(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.modulesService.getModuleStats(id, req.user.id);
  }



  @ApiOperation({ summary: 'Создать новый модуль' })
  @ApiResponse({ status: 201, description: 'Модуль успешно создан' })
  @Post()
  createModule(
    @Request() req,
    @Body() createModuleDto: ModuleDto
  ) {
    const userId = req.user?.id;

    console.log('[ModulesController] Received createModule request for user:', userId);
    console.log('[ModulesController] Received DTO:', JSON.stringify(createModuleDto, null, 2));

    if (userId === undefined || userId === null) {
      console.error('[ModulesController] User ID not found in request');
      throw new ForbiddenException('Не удалось определить пользователя для создания модуля');
    }
    
    return this.modulesService.createModule({
      ...createModuleDto,
      user_id: userId,
    });
  }



  @ApiOperation({ summary: 'Обновить модуль' })
  @ApiParam({ name: 'id', description: 'ID модуля', required: true })
  @ApiResponse({ status: 200, description: 'Модуль успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Модуль не найден' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  @Put(':id')
  updateModule(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateModuleDto: ModuleDto
  ) {
    const userId = req.user?.id;
    if (userId === undefined || userId === null) {
        console.error('[ModulesController] User ID not found in request for updateModule');
        throw new ForbiddenException('Не удалось определить пользователя для обновления модуля');
    }
        return this.modulesService.updateModule(id, updateModuleDto, userId);
  }



  @ApiOperation({ summary: 'Удалить модуль' })
  @ApiParam({ name: 'id', description: 'ID модуля', required: true })
  @ApiResponse({ status: 200, description: 'Модуль успешно удален' })
  @ApiResponse({ status: 404, description: 'Модуль не найден' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  @Delete(':id')
  deleteModule(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.modulesService.deleteModule(id, req.user.id);
  }



  @ApiOperation({ summary: 'Получить статистику модуля по дням' })
  @ApiParam({ name: 'id', description: 'ID модуля', required: true })
  @ApiQuery({ name: 'from', description: 'Начальная дата (YYYY-MM-DD)', required: false })
  @ApiQuery({ name: 'to', description: 'Конечная дата (YYYY-MM-DD)', required: false })
  @ApiResponse({ status: 200, description: 'Статистика по дням' })
  @ApiResponse({ status: 404, description: 'Модуль не найден' })
  @Get(':id/daily-stats')
  getDailyStats(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string
  ) {
    return this.modulesService.getDailyStats(id, req.user.id, fromDate, toDate);
  }



  @ApiOperation({ summary: 'Получить список доступных языков' })
  @ApiResponse({ status: 200, description: 'Список языков' })
  @Get('languages/all')
  getLanguages() {
    console.log('[ModulesController] Received request for getLanguages');
    try {
       const result = this.modulesService.getLanguages();
       console.log('[ModulesController] Returning languages from service.');
       return result;
    } catch (error) {
        console.error('[ModulesController] Error calling modulesService.getLanguages:', error);
        throw error;
    }
  }

}
