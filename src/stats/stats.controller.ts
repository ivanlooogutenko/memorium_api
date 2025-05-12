import { Controller, Get, Query, UseGuards, Request, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { StatsService, WeeklyGlobalStatItemDto, GlobalAppStatsDto } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { StatsFilterDto } from './dto/stats-filter.dto';
import { DailyStatItemDto } from './dto/daily-stat-item.dto';
import { GlobalProgressDto } from './dto/global-progress.dto';
import { UserRole } from '@prisma/client';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('weekly')
  @ApiOperation({ summary: 'Global weekly stats (7 days)' })
  @ApiResponse({ status: 200, type: [WeeklyGlobalStatItemDto] })
  async getWeeklyStats(
    @Request() req,
  ): Promise<WeeklyGlobalStatItemDto[]> {
    return this.statsService.getWeeklyStats(req.user.id);
  }

  @Get('daily')
  @ApiOperation({ summary: 'Global daily stats' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'moduleId', required: false, type: Number })
  @ApiResponse({ status: 200, type: [DailyStatItemDto] })
  async getDailyStats(
    @Request() req,
    @Query(new ValidationPipe({ transform: true, skipMissingProperties: true }))
    filter: StatsFilterDto,
  ): Promise<DailyStatItemDto[]> {
    return this.statsService.getDailyStats(req.user.id, filter);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Summary stats' })
  @ApiResponse({ status: 200 })
  async getSummary(@Request() req) {
    return this.statsService.getSummary(req.user.id);
  }

  @Get('modules')
  @ApiOperation({ summary: 'Stats per module' })
  @ApiResponse({ status: 200 })
  async getModulesStats(@Request() req) {
    return this.statsService.getModulesStats(req.user.id);
  }

  @Get('module')
  @ApiOperation({ summary: 'Stats for specific module' })
  @ApiQuery({ name: 'id', required: true, type: Number })
  @ApiResponse({ status: 200 })
  async getModuleStats(
    @Request() req,
    @Query('id', ParseIntPipe) moduleId: number,
  ) {
    return this.statsService.getModuleStats(req.user.id, moduleId);
  }

  @Get('learning-progress')
  @ApiOperation({ summary: 'Learning progress counts' })
  @ApiResponse({ status: 200 })
  async getLearningProgress(@Request() req) {
    return this.statsService.getLearningProgress(req.user.id);
  }

  @Get('global-daily-progress')
  @ApiOperation({ summary: 'Global daily progress' })
  @ApiResponse({ status: 200, type: GlobalProgressDto })
  async getGlobalDailyProgress(@Request() req): Promise<GlobalProgressDto> {
    return this.statsService.getGlobalDailyProgress(req.user.id);
  }

  @UseGuards(AdminGuard)
  @Get('admin/global-app-stats')
  @ApiOperation({ summary: '[ADMIN] Get global application statistics' })
  @ApiResponse({ status: 200, description: 'Global application statistics', type: GlobalAppStatsDto })
  async getGlobalAppStats(@Request() req): Promise<GlobalAppStatsDto> {
    return this.statsService.getGlobalAppStats(req.user.role as UserRole);
  }
}