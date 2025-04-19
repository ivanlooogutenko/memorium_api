import { IsDate, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StatsFilterDto {
  @ApiProperty({
    description: 'Начальная дата для фильтрации статистики',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @ApiProperty({
    description: 'Конечная дата для фильтрации статистики',
    example: '2025-03-01',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;

  @ApiProperty({
    description: 'ID модуля для фильтрации статистики',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  moduleId?: number;
} 