import { Injectable } from '@nestjs/common';
import { CardStatus, ReviewRating } from '@prisma/client';



@Injectable()
export class FsrsService {

  calculateNextReview(
    rating: ReviewRating,
    currentStatus: CardStatus,
    stability: number | null,
    difficulty: number,
    review_count: number,
    lapses: number,
    learning_step: number,
  ): {
    status: CardStatus;
    stability: number;
    difficulty: number;
    due_date: Date;
    review_count: number;
    lapses: number;
    last_review: Date;
    learning_step: number;
  } {

    const now = new Date();
    const currentStability = stability ?? 1.0;
    
    let newStability = currentStability;
    let newDifficulty = difficulty;
    let newStatus: CardStatus = currentStatus;
    let newLapses = lapses;
    let newReviewCount = review_count;
    let newLearningStep = learning_step;
    let dueDate = new Date(now);


    if (currentStatus === 'new') {
      
      newStatus = 'learning';
      newLearningStep = 1;
      dueDate.setMinutes(dueDate.getMinutes() + 10);
      newReviewCount += 1;
      
    } else if (currentStatus === 'learning') {
      
      switch (rating) {
        case 'again':
          
          newLearningStep = 0;
          dueDate.setMinutes(dueDate.getMinutes() + 10);
          newLapses += 1;
          break;
          
        case 'hard':
        case 'good':
          
          newLearningStep += 1;
          
          if (newLearningStep >= 3) {
            newStatus = 'review';
            newStability = 1.5;
            dueDate.setDate(dueDate.getDate() + 1);
          } else {
            dueDate.setMinutes(dueDate.getMinutes() + 10);
          }
          break;
          
        case 'easy':
          
          newStatus = 'review';
          newStability = 2.0;
          dueDate.setDate(dueDate.getDate() + 2);
          break;
      }
      
      newReviewCount += 1;
      
    } else {
      
      newReviewCount += 1;
      newLearningStep = 0;
      
      switch (rating) {
        case 'again':
          
          newStability *= 0.2;
          newDifficulty = Math.min(newDifficulty + 0.1, 1.0);
          dueDate.setMinutes(dueDate.getMinutes() + 10);
          newStatus = 'learning';
          newLapses += 1;
          break;

        case 'hard':
          
          newStability *= 0.8;
          newDifficulty = Math.min(newDifficulty + 0.05, 1.0);
          dueDate.setDate(dueDate.getDate() + 1);
          break;

        case 'good':
          
          newStability *= 1.5;
          dueDate.setDate(dueDate.getDate() + Math.ceil(newStability));
          break;

        case 'easy':
          
          newStability *= 2.0;
          newDifficulty = Math.max(newDifficulty - 0.05, 0.1);
          dueDate.setDate(dueDate.getDate() + Math.ceil(newStability * 1.5));
          newStatus = newReviewCount >= 18 ? 'mastered' : 'review';
          break;

        default:
          throw new Error('Некорректный рейтинг');
      }
    }

    return {
      status: newStatus,
      stability: newStability,
      difficulty: newDifficulty,
      due_date: dueDate,
      review_count: newReviewCount,
      lapses: newLapses,
      last_review: now,
      learning_step: newLearningStep,
    };
    
  }

}
