import { IsDate, IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StatsFilterDto {
  @ApiPropertyOptional({ example: '2025-04-01' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @ApiPropertyOptional({ example: '2025-04-30' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  moduleId?: number;
}