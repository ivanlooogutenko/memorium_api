import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewDto {
  @ApiProperty({ minimum: 1, maximum: 4 }) @IsInt() @Min(1) @Max(4)
  rating: number;
}
