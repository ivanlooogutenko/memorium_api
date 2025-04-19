import { IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewDto {
  @ApiProperty({
    description: 'Оценка карточки пользователем (1: Again, 2: Hard, 3: Good, 4: Easy)',
    minimum: 1,
    maximum: 4,
    example: 3,
    type: Number,
  })
  @IsNotEmpty({ message: 'Оценка карточки обязательна' })
  @IsInt({ message: 'Оценка должна быть целым числом' })
  @Min(1, { message: 'Минимальная оценка - 1' })
  @Max(4, { message: 'Максимальная оценка - 4' })
  rating: number;
}
