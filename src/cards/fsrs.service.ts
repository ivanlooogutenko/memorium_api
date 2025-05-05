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
  /** Создает экземпляр FSRS с пользовательскими или дефолтными параметрами */
  private createFsrs(params?: Prisma.JsonValue): FSRS {
    const defaultParams = generatorParameters({ request_retention: 0.80 });
    const fsrsParams =
      params && typeof params === 'object' && !Array.isArray(params) && Object.keys(params).length
        ? (params as unknown as FSRSParameters)
        : defaultParams;
    return new FSRS(fsrsParams);
  }

  /** Конвертирует рейтинг из БД в FSRS */
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

  /** Конвертирует рейтинг из FSRS для сохранения в БД */
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

  /** Конвертирует состояние из БД в FSRS */
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

    // Map current DB state to FSRS card state
    src.state           = FsrsService.mapToFsrsState(current.status);
    src.due             = current.due_date || now;
    // Always use current stability/difficulty for the calculation
    src.stability       = current.stability;
    src.difficulty      = current.difficulty;
    src.reps            = current.review_count;
    src.lapses          = current.lapses;
    // Remove the block that forced initial params for new/learning
    src.last_review     = current.last_review || undefined;
    src.elapsed_days    = current.last_review ? Math.floor((now.getTime() - current.last_review.getTime()) / 864e5) : 0;
    src.scheduled_days  = current.last_review && current.due_date
      ? Math.floor((current.due_date.getTime() - current.last_review.getTime()) / 864e5)
      : 0;

    // Perform FSRS calculation
    const result = fsrs.repeat(src, now)[rating];
    if (!result) {
      throw new Error(`Не удалось рассчитать повторение для рейтинга ${rating}`);
    }

    // Determine status based on FSRS and custom logic
    let fsrsCalculatedStatus = FsrsService.mapFromFsrsState(result.card.state);
    let learningStep = 0;
    if (result.card.state === FsrsState.Relearning) {
      fsrsCalculatedStatus = CardStatus.learning;
      learningStep = 1;
    }

    // Base update object only with fields always updated
    const update: Partial<Omit<CardSchedule, 'card_id'>> & { consecutiveGoodCount?: number, lastAnsweredGoodDate?: Date | null } = {
      last_review: now,
      learning_step: learningStep, // Keep track of FSRS learning step if needed
      consecutiveGoodCount: current.consecutiveGoodCount ?? 0,
      lastAnsweredGoodDate: current.lastAnsweredGoodDate ?? null
    };

    let finalStatus = fsrsCalculatedStatus;

    // --- Custom Logic & Lapse Handling --- 
    if ((current.status === CardStatus.review || current.status === CardStatus.mastered) && rating === FsrsRating.Again) {
      // Explicit Lapse: force back to learning and RESET FSRS params
      console.log(`[FsrsService calculate] Lapse detected for card ID ${current.card_id}. Resetting to initial learning state.`);
      finalStatus = CardStatus.learning;
      update.consecutiveGoodCount = 0;
      update.lastAnsweredGoodDate = null;

      const initialSchedule = this.initSchedule(); // Get defaults
      update.stability = initialSchedule.stability;
      update.difficulty = initialSchedule.difficulty;
      update.review_count = 0; // Reset review count
      update.lapses = current.lapses + 1; // Increment lapses

      // Due date will be set to today later in the conditional block

    } else if (current.status === CardStatus.learning) {
      // Handle learning phase and graduation
      if (rating === FsrsRating.Good || rating === FsrsRating.Easy) {
        const currentGoodCount = current.consecutiveGoodCount ?? 0;
        const isConsecutiveDay = current.lastAnsweredGoodDate
          ? now.toDateString() === current.lastAnsweredGoodDate.toDateString() ||
            (now.getTime() - current.lastAnsweredGoodDate.getTime()) < 2 * 86400000
          : true;

        let newGoodCount = isConsecutiveDay ? currentGoodCount + 1 : 1;
        update.lastAnsweredGoodDate = now;

        if (newGoodCount >= 3) {
          finalStatus = CardStatus.review; // Graduate
          update.consecutiveGoodCount = 0; // Reset counter
          update.lastAnsweredGoodDate = null;
          update.learning_step = 0; // Clear step
        } else {
          finalStatus = CardStatus.learning; // Stay learning
          update.consecutiveGoodCount = newGoodCount; // Update counter
        }
      } else if (rating === FsrsRating.Again || rating === FsrsRating.Hard) {
        finalStatus = CardStatus.learning; // Stay learning on hard/again
        update.consecutiveGoodCount = 0; // Reset counter
        update.lastAnsweredGoodDate = null;
      }
    } else if (current.status === CardStatus.new) {
       // Handle first interaction
        finalStatus = CardStatus.learning; // Always becomes learning after first rep
        update.consecutiveGoodCount = (rating === FsrsRating.Good || rating === FsrsRating.Easy) ? 1 : 0; // Start counter if first answer is good/easy
        update.lastAnsweredGoodDate = (rating === FsrsRating.Good || rating === FsrsRating.Easy) ? now : null;
    } else {
      // If already review/mastered and not lapsed, use FSRS status
      finalStatus = fsrsCalculatedStatus;
      update.consecutiveGoodCount = 0;
      update.lastAnsweredGoodDate = null;
    }
    // --- End Custom Logic & Lapse Handling --- 

    update.status = finalStatus; // Set the determined status

    // --- Apply FSRS Calculation Results Conditionally ---
    if (finalStatus === CardStatus.review || finalStatus === CardStatus.mastered) {
       if (!((current.status === CardStatus.review || current.status === CardStatus.mastered) && rating === FsrsRating.Again)) {
         // Apply FSRS calculated values ONLY IF NOT a lapse (lapse values were set above)
          console.log(`[FsrsService calculate] Applying FSRS results for card ID ${current.card_id} transitioning to/in ${finalStatus}`);
          update.difficulty = result.card.difficulty;
          update.stability = result.card.stability;
          // Set reps to 1 only on the *first* graduation from learning
          update.review_count = (current.status === CardStatus.learning && finalStatus === CardStatus.review) ? 1 : result.card.reps;
          // update.lapses = result.card.lapses; // Lapses handled during lapse detection
          const fsrsDueDate = new Date(result.card.due);
          fsrsDueDate.setHours(0, 0, 0, 0);
          update.due_date = fsrsDueDate;
          update.learning_step = result.card.state === FsrsState.Relearning ? 1 : 0; // Update learning step from FSRS
       } else {
          // This was a lapse, FSRS params already reset, just ensure due date is today
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);
          update.due_date = todayStart;
          console.log(`[FsrsService calculate] Lapse occurred for card ID ${current.card_id}. FSRS results NOT applied. Due date set to today.`);
          update.learning_step = 1; // Start relearning step after lapse
       }
    } else { // finalStatus is new or learning
      // Set due date to today and DO NOT apply FSRS stability/difficulty/reps/lapses
      console.log(`[FsrsService calculate] Keeping/Resetting params & setting due date to today for card ID ${current.card_id} in status ${finalStatus}`);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      update.due_date = todayStart;
      // Ensure learning_step is managed if FSRS state was Relearning but we forced it to learning
       update.learning_step = (result.card.state === FsrsState.Relearning && finalStatus === CardStatus.learning) ? 1 : 0;
       // If it wasn't a lapse, keep current lapses count
       if (!((current.status === CardStatus.review || current.status === CardStatus.mastered) && rating === FsrsRating.Again)) {
           update.lapses = current.lapses;
       }
    }
    // --- End Conditional Application ---

    // Prepare log data
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