import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class GetWeeklyStatsQueryDto {
  @ApiPropertyOptional({
    description: 'ID модуля для фильтрации статистики (если не указан, статистика по всем модулям)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  moduleId?: number;
}

export class WeeklyStatItemDto {
  @ApiPropertyOptional({ description: 'Дата в формате YYYY-MM-DD', example: '2024-07-21' })
  date: string;

  @ApiPropertyOptional({ description: 'Количество ревью за день', example: 15 })
  reviewsCount: number;
} 