import { Injectable } from '@nestjs/common';
import { CardStatus, ReviewRating, Prisma } from '@prisma/client';
import {
  FSRS,
  Card as FsrsCard,
  createEmptyCard,
  generatorParameters,
  Rating,
  FSRSParameters,
} from 'ts-fsrs';

type InitialScheduleData = Omit<Prisma.CardScheduleCreateInput, 'card_id' | 'card'>;

@Injectable()
export class FsrsService {
  private fsrs: FSRS;

  constructor() {
        const params: FSRSParameters = generatorParameters({
      request_retention: 0.9,       maximum_interval: 365,       enable_fuzz: true,       enable_short_term: true,     });
    this.fsrs = new FSRS(params);
  }

    private mapRating(rating: ReviewRating): Rating {
    switch (rating) {
      case 'again':
        return Rating.Again;
      case 'hard':
        return Rating.Hard;
      case 'good':
        return Rating.Good;
      case 'easy':
        return Rating.Easy;
      default:
        throw new Error('Некорректный рейтинг');
    }
  }

    private createFsrsCardFromState(
    lastReview: Date | null,
    dueDate: Date | null,
    stability: number | null,
    difficulty: number,
    lapses: number,
    reps: number,
    state: CardStatus,
  ): FsrsCard {
        const card = createEmptyCard(lastReview || new Date());

        card.due = dueDate || new Date();
    card.stability = stability || 0;
    card.difficulty = difficulty;
    card.lapses = lapses;
    card.reps = reps;
    
        switch (state) {
      case 'new':
        card.state = 0;
        break;
      case 'learning':
        card.state = 1;
        break;
      case 'review':
        card.state = 2;
        break;
      case 'mastered':
        card.state = 3;
        break;
    }

    return card;
  }

    private mapCardStateToStatus(state: number): CardStatus {
    switch (state) {
      case 0:
        return 'new';
      case 1:
        return 'learning';
      case 2:
        return 'review';
      case 3:
        return 'mastered';
      default:
        return 'new';
    }
  }

  public initialStatus(): InitialScheduleData {
    const now = new Date();
    const emptyCard = createEmptyCard(now);
    return {
      status: this.mapCardStateToStatus(emptyCard.state),
      difficulty: emptyCard.difficulty,
      stability: emptyCard.stability,
      review_count: emptyCard.reps,
      lapses: emptyCard.lapses,
      last_review: null,
      due_date: emptyCard.due,
      learning_step: 0,
    };
  }

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
    
        const fsrsCard = this.createFsrsCardFromState(
      currentStatus === 'new' ? null : now,
      null,
      stability,
      difficulty,
      lapses,
      review_count,
      currentStatus,
    );

        const fsrsRating = this.mapRating(rating);
    const nextState = this.fsrs.next(fsrsCard, now, fsrsRating as any);
    
        let newLearningStep = learning_step;
    
    if (currentStatus === 'new') {
      newLearningStep = 1;
    } else if (currentStatus === 'learning') {
      if (rating === 'again') {
        newLearningStep = 0;
      } else if (rating === 'hard' || rating === 'good') {
        newLearningStep += 1;
      } else if (rating === 'easy') {
        newLearningStep = 3;       }
    } else {
      if (rating === 'again') {
        newLearningStep = 0;
      }
    }

        let newStatus = this.mapCardStateToStatus(nextState.card.state);
    
        if (newStatus === 'learning' && newLearningStep >= 3) {
      newStatus = 'review';
    }
    
        if (newStatus === 'review' && rating === 'easy' && review_count >= 18) {
      newStatus = 'mastered';
    }

    return {
      status: newStatus,
      stability: nextState.card.stability,
      difficulty: nextState.card.difficulty,
      due_date: nextState.card.due,
      review_count: review_count + 1,
      lapses: nextState.card.lapses,
      last_review: now,
      learning_step: newLearningStep,
    };
  }

  // Возвращаем метод прогнозирования
  public predictSchedule(
    currentStatus: CardStatus,
    stability: number | null,
    difficulty: number,
    review_count: number,
    lapses: number,
    learning_step: number,
    last_review: Date | null,
    due_date: Date | null,
    steps: number = 6,
    assumedRating: ReviewRating = ReviewRating.good
  ): Array<{ step: number; due_date: Date; status: CardStatus }> {
    
    const predictions: Array<{ step: number; due_date: Date; status: CardStatus }> = [];
    const now = new Date();

    let currentFsrsCard = this.createFsrsCardFromState(
      last_review,
      due_date,
      stability,
      difficulty,
      lapses,
      review_count,
      currentStatus
    );
    if (currentStatus === 'new') {
      currentFsrsCard = createEmptyCard(now);
    }

    let currentSimulatedStatus = currentStatus;
    let currentSimulatedLearningStep = learning_step;
    
    let simulatedReviewTime = (due_date && due_date > now) ? new Date(due_date.getTime()) : new Date(now.getTime());

    const fsrsAssumedRating = this.mapRating(assumedRating);

    for (let step = 1; step <= steps; step++) {
        const nextStateResult = this.fsrs.next(currentFsrsCard, simulatedReviewTime, fsrsAssumedRating as any);

        let nextSimulatedLearningStep = currentSimulatedLearningStep;
        if (currentSimulatedStatus === 'new') {
          nextSimulatedLearningStep = 1;
        } else if (currentSimulatedStatus === 'learning') {
          if (assumedRating === ReviewRating.again) nextSimulatedLearningStep = 0;
          else if (assumedRating === ReviewRating.hard || assumedRating === ReviewRating.good) nextSimulatedLearningStep += 1;
          else if (assumedRating === ReviewRating.easy) nextSimulatedLearningStep = 3;
        } else { 
          if (assumedRating === ReviewRating.again) nextSimulatedLearningStep = 0; 
        }
        
        let predictedStatus = this.mapCardStateToStatus(nextStateResult.card.state);
        if (predictedStatus === 'learning' && nextSimulatedLearningStep >= 3) {
          predictedStatus = 'review';
        }
       
        predictions.push({
          step,
          due_date: nextStateResult.card.due,
          status: predictedStatus,
        });
        
        currentFsrsCard = nextStateResult.card;
        currentSimulatedStatus = predictedStatus;
        currentSimulatedLearningStep = nextSimulatedLearningStep;
        simulatedReviewTime = new Date(nextStateResult.card.due.getTime()); 
    }

    return predictions;
  }

}
