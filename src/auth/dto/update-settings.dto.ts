import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserSettingsDto {
  @ApiProperty({ description: 'Новая дневная цель карточек', example: 20, required: false, minimum: 1, maximum: 1000 })
  @IsOptional() @IsInt() @Min(1) @Max(1000)
  dailyGoal?: number;
}