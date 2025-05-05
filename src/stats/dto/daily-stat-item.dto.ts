import { ApiPropertyOptional } from '@nestjs/swagger';

export class DailyStatItemDto {
  @ApiPropertyOptional({ example: '2025-05-01' })
  date: string;

  @ApiPropertyOptional({ example: 10 })
  reviewsCount: number;

  @ApiPropertyOptional({ example: 0 })
  newCount: number;

  @ApiPropertyOptional({ example: 0 })
  learningCount: number;

  @ApiPropertyOptional({ example: 0 })
  reviewCount: number;

  @ApiPropertyOptional({ example: 0 })
  masteredCount: number;
}