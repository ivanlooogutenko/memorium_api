import { ApiPropertyOptional } from '@nestjs/swagger';

export class GlobalProgressDto {
  @ApiPropertyOptional({ example: 5 })
  completedToday: number;

  @ApiPropertyOptional({ example: 3 })
  currentStreak: number;

  @ApiPropertyOptional({ example: 10 })
  maxStreak: number;
}