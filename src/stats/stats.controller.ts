import { Controller, Get, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatsFilterDto } from './dto/stats-filter.dto';



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
  
}
