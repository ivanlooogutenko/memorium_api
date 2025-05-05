import { Injectable, BadRequestException } from '@nestjs/common';
import { CardStatus, ReviewRating as PrismaReviewRating, CardSchedule, Prisma } from '@prisma/client';
import {
  FSRS,
  Card as FsrsCard,
  generatorParameters,
  Rating as FsrsRating,
  FSRSParameters,
  createEmptyCard,
  State as FsrsState,
} from 'ts-fsrs';

@Injectable()
export class FsrsService {

  private createFsrs(params?: Prisma.JsonValue): FSRS {
    const defaultParams = generatorParameters({ request_retention: 0.80 });
    const fsrsParams =
      params && typeof params === 'object' && !Array.isArray(params) && Object.keys(params).length
        ? (params as unknown as FSRSParameters)
        : defaultParams;
    return new FSRS(fsrsParams);
  }

  static mapToFsrsRating(db: PrismaReviewRating): FsrsRating {
    const map: Record<PrismaReviewRating, FsrsRating> = {
      again: FsrsRating.Again,
      hard:  FsrsRating.Hard,
      good:  FsrsRating.Good,
      easy:  FsrsRating.Easy,
    };
    if (!(db in map)) {
      throw new BadRequestException(`Неверный рейтинг: ${db}`);
    }
    return map[db];
  }


  static mapFromFsrsRating(fsrs: FsrsRating): PrismaReviewRating {
    const map: Record<FsrsRating, PrismaReviewRating | null> = {
      [FsrsRating.Again]: 'again',
      [FsrsRating.Hard]:  'hard',
      [FsrsRating.Good]:  'good',
      [FsrsRating.Easy]:  'easy',
      [FsrsRating.Manual]: null,
    };
    const result = map[fsrs];
    if (result === null) {
      throw new BadRequestException(`Рейтинг Manual не поддерживается для сохранения.`);
    }
    return result;
  }


  static mapToFsrsState(status: CardStatus): FsrsState {
    const map: Record<CardStatus, FsrsState> = {
      new:      FsrsState.New,
      learning: FsrsState.Learning,
      review:   FsrsState.Review,
      mastered: FsrsState.Review,
    };
    return map[status] ?? FsrsState.New;
  }

  static mapFromFsrsState(state: FsrsState): CardStatus {
    const map: Record<FsrsState, CardStatus> = {
      [FsrsState.New]:        'new',
      [FsrsState.Learning]:   'learning',
      [FsrsState.Review]:     'review',
      [FsrsState.Relearning]: 'learning',
    };
    return map[state];
  }

  initSchedule(): Omit<CardSchedule, 'card_id'> {
    const now = new Date();
    const card = createEmptyCard(now);
    const due = new Date(card.due);
    due.setHours(0, 0, 0, 0);

    return {
      status:                 FsrsService.mapFromFsrsState(card.state),
      difficulty:             card.difficulty,
      stability:              card.stability,
      review_count:           card.reps,
      lapses:                 card.lapses,
      last_review:            null,
      due_date:               due,
      learning_step:          0,
      consecutiveGoodCount:   0,
      lastAnsweredGoodDate:   null,
    };
  }


  calculate(
    current: CardSchedule & { consecutiveGoodCount?: number | null, lastAnsweredGoodDate?: Date | null },
    rating: FsrsRating,
    now: Date,
    params?: Prisma.JsonValue,
  ): { update: Partial<Omit<CardSchedule, 'card_id'>>; log: { status: CardStatus; rating: PrismaReviewRating } } {
    const fsrs = this.createFsrs(params);
    const src = createEmptyCard(now);

    src.state           = FsrsService.mapToFsrsState(current.status);
    src.due             = current.due_date || now;
    src.stability       = current.stability;
    src.difficulty      = current.difficulty;
    src.reps            = current.review_count;
    src.lapses          = current.lapses;
    src.last_review     = current.last_review || undefined;
    src.elapsed_days    = current.last_review ? Math.floor((now.getTime() - current.last_review.getTime()) / 864e5) : 0;
    src.scheduled_days  = current.last_review && current.due_date
      ? Math.floor((current.due_date.getTime() - current.last_review.getTime()) / 864e5)
      : 0;

    const result = fsrs.repeat(src, now)[rating];
    if (!result) {
      throw new Error(`Не удалось рассчитать повторение для рейтинга ${rating}`);
    }

    let fsrsCalculatedStatus = FsrsService.mapFromFsrsState(result.card.state);
    let learningStep = 0;
    if (result.card.state === FsrsState.Relearning) {
      fsrsCalculatedStatus = CardStatus.learning;
      learningStep = 1;
    }

    const update: Partial<Omit<CardSchedule, 'card_id'>> & { consecutiveGoodCount?: number, lastAnsweredGoodDate?: Date | null } = {
      last_review: now,
      learning_step: learningStep,
      consecutiveGoodCount: current.consecutiveGoodCount ?? 0,
      lastAnsweredGoodDate: current.lastAnsweredGoodDate ?? null
    };

    let finalStatus = fsrsCalculatedStatus;

    if ((current.status === CardStatus.review || current.status === CardStatus.mastered) && rating === FsrsRating.Again) {

      finalStatus = CardStatus.learning;
      update.consecutiveGoodCount = 0;
      update.lastAnsweredGoodDate = null;

      const initialSchedule = this.initSchedule(); 
      update.stability = initialSchedule.stability;
      update.difficulty = initialSchedule.difficulty;
      update.review_count = 0; 
      update.lapses = current.lapses + 1; 



    } else if (current.status === CardStatus.learning) {
      if (rating === FsrsRating.Good || rating === FsrsRating.Easy) {
        const currentGoodCount = current.consecutiveGoodCount ?? 0;
        const isConsecutiveDay = current.lastAnsweredGoodDate
          ? now.toDateString() === current.lastAnsweredGoodDate.toDateString() ||
            (now.getTime() - current.lastAnsweredGoodDate.getTime()) < 2 * 86400000
          : true;

        let newGoodCount = isConsecutiveDay ? currentGoodCount + 1 : 1;
        update.lastAnsweredGoodDate = now;

        if (newGoodCount >= 3) {
          finalStatus = CardStatus.review; 
          update.consecutiveGoodCount = 0; 
          update.lastAnsweredGoodDate = null;
          update.learning_step = 0; 
        } else {
          finalStatus = CardStatus.learning; 
          update.consecutiveGoodCount = newGoodCount;
        }
      } else if (rating === FsrsRating.Again || rating === FsrsRating.Hard) {
        finalStatus = CardStatus.learning; 
        update.consecutiveGoodCount = 0; 
        update.lastAnsweredGoodDate = null;
      }
    } else if (current.status === CardStatus.new) {
       
        finalStatus = CardStatus.learning; 
        update.consecutiveGoodCount = (rating === FsrsRating.Good || rating === FsrsRating.Easy) ? 1 : 0; 
        update.lastAnsweredGoodDate = (rating === FsrsRating.Good || rating === FsrsRating.Easy) ? now : null;
    } else {
      finalStatus = fsrsCalculatedStatus;
      update.consecutiveGoodCount = 0;
      update.lastAnsweredGoodDate = null;
    }

    update.status = finalStatus; 


    if (finalStatus === CardStatus.review || finalStatus === CardStatus.mastered) {
       if (!((current.status === CardStatus.review || current.status === CardStatus.mastered) && rating === FsrsRating.Again)) {

          update.difficulty = result.card.difficulty;
          update.stability = result.card.stability;

          update.review_count = (current.status === CardStatus.learning && finalStatus === CardStatus.review) ? 1 : result.card.reps;

          const fsrsDueDate = new Date(result.card.due);
          fsrsDueDate.setHours(0, 0, 0, 0);
          update.due_date = fsrsDueDate;
          update.learning_step = result.card.state === FsrsState.Relearning ? 1 : 0; 
       } else {

          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);
          update.due_date = todayStart;
          update.learning_step = 1; 
       }
    } else { 

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      update.due_date = todayStart;

       update.learning_step = (result.card.state === FsrsState.Relearning && finalStatus === CardStatus.learning) ? 1 : 0;

       if (!((current.status === CardStatus.review || current.status === CardStatus.mastered) && rating === FsrsRating.Again)) {
           update.lapses = current.lapses;
       }
    }

    const logRating = FsrsService.mapFromFsrsRating(rating);

    return {
      update,
      log: {
        status: finalStatus,
        rating: logRating,
      },
    };
  }
}