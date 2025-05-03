import { Injectable, BadRequestException } from '@nestjs/common';
import { CardStatus, ReviewRating as PrismaReviewRating, Prisma, CardSchedule, User } from '@prisma/client';
import {
  FSRS,
  Card as FsrsCard,
  createEmptyCard,
  generatorParameters,
  Rating as FsrsRating,
  FSRSParameters,
  State as FsrsState,
  ReviewLog as FsrsReviewLog,
  CardInput,
  DateInput,
} from 'ts-fsrs';


// Структура возвращаемого значения после расчета ревью
export interface CalculatedReviewResult {
  scheduleUpdateData: Partial<Omit<CardSchedule, 'card_id'>>;
  logData: {
    state: CardStatus;
    rating: PrismaReviewRating;
    // Можно добавить другие поля из FsrsReviewLog при необходимости
  };
}

@Injectable()
export class FsrsService {
    // Конструктор больше не нужен, т.к. FSRS создается по запросу с параметрами пользователя
    // constructor() {
    //     const params: FSRSParameters = generatorParameters({
    //       request_retention: 0.9,       maximum_interval: 365,       enable_fuzz: true,       enable_short_term: true,     });
    //     this.fsrs = new FSRS(params);
    // }

    // Метод для получения экземпляра FSRS с параметрами пользователя или дефолтными
    private getFsrsInstance(userFsrsParams?: Prisma.JsonValue): FSRS {
        let fsrsParams: FSRSParameters;
        if (userFsrsParams && typeof userFsrsParams === 'object' && !Array.isArray(userFsrsParams) && Object.keys(userFsrsParams).length > 0) {
            try {
                // Пробуем привести к FSRSParameters, могут быть ошибки типов
                fsrsParams = userFsrsParams as unknown as FSRSParameters;
                // TODO: Добавить валидацию параметров?
                console.log(`[FSRS] Using custom params for user.`);
            } catch (e) {
                console.error("[FSRS] Error casting user params, using default:", e);
                fsrsParams = generatorParameters(); 
            }
        } else {
            fsrsParams = generatorParameters();
            console.log(`[FSRS] Using default params for user.`);
        }
        return new FSRS(fsrsParams);
    }

    private getFsrsRating(rating: PrismaReviewRating): FsrsRating {
        switch (rating) {
            case PrismaReviewRating.again: return FsrsRating.Again;
            case PrismaReviewRating.hard:  return FsrsRating.Hard;
            case PrismaReviewRating.good:  return FsrsRating.Good;
            case PrismaReviewRating.easy:  return FsrsRating.Easy;
            default: throw new BadRequestException(`Некорректная оценка Prisma: ${rating}`);
        }
    }

    private getPrismaReviewRating(rating: FsrsRating): PrismaReviewRating {
        switch (rating) {
            case FsrsRating.Again: return PrismaReviewRating.again;
            case FsrsRating.Hard:  return PrismaReviewRating.hard;
            case FsrsRating.Good:  return PrismaReviewRating.good;
            case FsrsRating.Easy:  return PrismaReviewRating.easy;
            default: throw new BadRequestException(`Некорректная FSRS оценка: ${rating}`);
        }
    }
    
    private mapPrismaStatusToFsrsState(status: CardStatus): FsrsState {
        switch (status) {
            case CardStatus.new: return FsrsState.New;
            case CardStatus.learning: return FsrsState.Learning;
            case CardStatus.review: return FsrsState.Review;
            case CardStatus.mastered: return FsrsState.Review; // FSRS не имеет "mastered"
            default: return FsrsState.New;
        }
    }

    private mapFsrsStateToPrismaStatus(state: FsrsState): CardStatus {
        switch (state) {
            case FsrsState.New: return CardStatus.new;
            case FsrsState.Learning: return CardStatus.learning;
            case FsrsState.Review: return CardStatus.review;
            case FsrsState.Relearning: return CardStatus.learning; // Relearning -> learning
            default: return CardStatus.new;
        }
    }

    // Создание FSRS Card из Prisma CardSchedule
    private createFsrsCardFromSchedule(schedule: CardSchedule | null, now: Date): FsrsCard {
        if (!schedule) {
            return createEmptyCard(now);
        }
        const card = createEmptyCard(now);
        card.due = schedule.due_date || now;
        card.stability = schedule.stability;
        card.difficulty = schedule.difficulty;
        card.elapsed_days = schedule.last_review ? Math.max(0, Math.floor((now.getTime() - schedule.last_review.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        card.scheduled_days = schedule.last_review && schedule.due_date ? Math.max(0, Math.floor((schedule.due_date.getTime() - schedule.last_review.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        card.reps = schedule.review_count;
        card.lapses = schedule.lapses;
        card.state = this.mapPrismaStatusToFsrsState(schedule.status);
        if (schedule.last_review) {
            card.last_review = schedule.last_review;
        }
        return card;
    }

  public initialStatus(): Omit<CardSchedule, 'card_id'> {
    const now = new Date();
    const emptyCard = createEmptyCard(now);
    return {
      status: this.mapFsrsStateToPrismaStatus(emptyCard.state),
      difficulty: emptyCard.difficulty,
      stability: emptyCard.stability,
      review_count: emptyCard.reps,
      lapses: emptyCard.lapses,
      last_review: null,
      due_date: emptyCard.due,
      learning_step: 0, // Начальный шаг 0
      consecutiveGoodCount: 0,
      lastAnsweredGoodDate: null,
    };
  }

  /**
   * Рассчитывает следующее состояние карточки с использованием FSRS.
   * Применяется для статусов Review и при переходе из Learning в Review.
   */
  public calculateFsrsReview(
    currentSchedule: CardSchedule,
    rating: FsrsRating,
    now: Date, // Время фактического ревью
    userFsrsParams?: Prisma.JsonValue
  ): CalculatedReviewResult {
    const fsrs = this.getFsrsInstance(userFsrsParams);
    const fsrsCard = this.createFsrsCardFromSchedule(currentSchedule, now);
    const result = fsrs.repeat(fsrsCard, now);
    const nextState = result[rating];

    if (!nextState) {
      throw new Error(`FSRS calculation failed for rating ${rating}.`);
    }

    // Вычисляем начало текущего дня
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const scheduleUpdateData: Partial<Omit<CardSchedule, 'card_id'>> = {
        stability: nextState.card.stability,
        difficulty: nextState.card.difficulty,
        due_date: nextState.card.due, // Используем дату, рассчитанную FSRS
        status: this.mapFsrsStateToPrismaStatus(nextState.card.state),
        review_count: nextState.card.reps,
        lapses: nextState.card.lapses,
        last_review: now,
        learning_step: 0,
    };

    const logData = {
      state: this.mapFsrsStateToPrismaStatus(nextState.card.state),
      rating: this.getPrismaReviewRating(rating)
    };

    // Особая обработка для Relearning
    if (nextState.card.state === FsrsState.Relearning) {
      console.log(`[FSRS Service] Card moved to Relearning state by FSRS.`);
      scheduleUpdateData.status = CardStatus.learning;
      scheduleUpdateData.learning_step = 1;
      // Устанавливаем due_date на НАЧАЛО ТЕКУЩЕГО ДНЯ
      scheduleUpdateData.due_date = todayStart; 
      logData.state = CardStatus.learning;
    }

    return { scheduleUpdateData, logData };
  }

  // TODO: Пересмотреть и удалить старый calculateNextReview и predictSchedule, если они больше не нужны или требуют адаптации
  // public calculateNextReview(...) { ... } 
  // public predictSchedule(...) { ... }
}
