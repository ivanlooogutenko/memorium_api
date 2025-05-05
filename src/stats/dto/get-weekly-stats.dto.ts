import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetWeeklyStatsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  moduleId?: number;
}

export class WeeklyStatItemDto {
  @ApiPropertyOptional({ example: '2025-05-01' })
  date: string;

  @ApiPropertyOptional({ example: 15 })
  reviewsCount: number;
}