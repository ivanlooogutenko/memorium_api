import { Controller, Get, Query, UseGuards, Request, ParseIntPipe, ValidationPipe } from '@nestjs/common';
import { StatsService, GlobalProgressResponse } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StatsFilterDto } from './dto/stats-filter.dto';
import { GetWeeklyStatsQueryDto, WeeklyStatItemDto } from './dto/get-weekly-stats.dto';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {

  constructor(private readonly statsService: StatsService) {}

  @ApiOperation({ summary: 'Получить общую статистику пользователя' })
  @ApiResponse({ status: 200, description: 'Общая статистика пользователя' })
  @Get('summary')
  getUserSummary(@Request() req) {
    return this.statsService.getUserSummary(req.user.id);
  }

  @ApiOperation({ summary: 'Получить ежедневную статистику пользователя' })
  @ApiResponse({ status: 200, description: 'Ежедневная статистика пользователя' })
  @Get('daily')
  getDailyStats(
    @Request() req,
    @Query() filterDto: StatsFilterDto
  ) {
    return this.statsService.getDailyStats(
      req.user.id,
      filterDto.moduleId,
      filterDto.fromDate,
      filterDto.toDate
    );
  }

  @ApiOperation({ summary: 'Получить еженедельную статистику пользователя (засчитанные повторения)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Глобальная еженедельная статистика пользователя (массив из 7 элементов, только засчитанные повторения)', 
    type: [WeeklyStatItemDto] 
  })
  @ApiQuery({ name: 'moduleId', required: false, type: Number, description: 'ID модуля для фильтрации (необязательно)' })
  @Get('weekly')
  getWeeklyStats(
    @Request() req,
    @Query(new ValidationPipe({ transform: true, skipMissingProperties: true })) query: GetWeeklyStatsQueryDto
  ) {
    return this.statsService.getWeeklyStats(req.user.id);
  }

  @ApiOperation({ summary: 'Получить статистику по всем модулям пользователя' })
  @ApiResponse({ status: 200, description: 'Статистика по модулям' })
  @Get('modules')
  getModulesStats(@Request() req) {
    return this.statsService.getModulesStats(req.user.id);
  }

  @ApiOperation({ summary: 'Получить детальную статистику по конкретному модулю' })
  @ApiResponse({ status: 200, description: 'Статистика модуля' })
  @ApiResponse({ status: 404, description: 'Модуль не найден' })
  @Get('module')
  getModuleStats(
    @Request() req,
    @Query('id', ParseIntPipe) moduleId: number
  ) {
    return this.statsService.getModuleStats(req.user.id, moduleId);
  }

  @ApiOperation({ summary: 'Получить прогресс обучения пользователя' })
  @ApiResponse({ status: 200, description: 'Прогресс обучения пользователя' })
  @Get('learning-progress')
  getLearningProgress(@Request() req) {
    return this.statsService.getLearningProgress(req.user.id);
  }

  @Get('global-daily-progress')
  @ApiOperation({ summary: 'Получить глобальный прогресс цели на день' })
  @ApiResponse({ 
    status: 200, 
    description: 'Глобальный прогресс цели дня (выполненные повторения, текущий и макс. стрик)',
    type: () => Object,
  })
  async getGlobalDailyProgress(@Request() req): Promise<GlobalProgressResponse> {
    return this.statsService.getGlobalDailyProgress(req.user.id);
  }
}
