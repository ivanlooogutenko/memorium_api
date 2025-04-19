import { ApiProperty } from '@nestjs/swagger';
import { CardStatus } from '@prisma/client';

// Этот DTO больше не используется в таком виде
// class PredictedRatingResultDto { ... }

// Переименовываем и меняем структуру
export class PredictedStepDto {
  @ApiProperty({ description: 'Номер шага прогноза (начиная с 1)', example: 1 })
  step: number;

  @ApiProperty({ description: 'Предсказанная дата следующего повторения для этого шага (при оценке "good")', type: Date })
  due_date: Date;

  @ApiProperty({ description: 'Предсказанный статус карточки после этого шага (при оценке "good")', enum: CardStatus })
  status: CardStatus;

  // Убираем поле ratings
  // @ApiProperty({ ... })
  // ratings: Record<ReviewRating, PredictedRatingResultDto>; 
} 