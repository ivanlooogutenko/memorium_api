import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardDto } from './dto/card.dto';
import { ReviewDto } from './dto/review.dto';
import { CardStatus, Prisma, Card, ReviewRating as PrismaReviewRating, CardSchedule, User, ReviewLog } from '@prisma/client';
import { FSRS, Card as FsrsCard, ReviewLog as FsrsReviewLog, State as FsrsState, Rating as FsrsRating, FSRSParameters, generatorParameters, createEmptyCard } from 'ts-fsrs';
import { EntityNotFoundException, InvalidOperationException } from '../common/exceptions/business.exceptions';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { FsrsService } from './fsrs.service';

@Injectable()
export class CardsService {

  constructor(
    private prisma: PrismaService,
    private fsrsService: FsrsService
  ) {}

  private getFsrsRating(rating: number): FsrsRating {
    switch (rating) {
      case 1: return FsrsRating.Again;
      case 2: return FsrsRating.Hard;
      case 3: return FsrsRating.Good;
      case 4: return FsrsRating.Easy;
      default: throw new BadRequestException(`Некорректная оценка FSRS: ${rating}`);
    }
  }

  private getPrismaReviewRating(rating: number): PrismaReviewRating {
      switch (rating) {
        case 1: return PrismaReviewRating.again;
        case 2: return PrismaReviewRating.hard;
        case 3: return PrismaReviewRating.good;
        case 4: return PrismaReviewRating.easy;
        default: throw new BadRequestException(`Некорректная оценка Prisma: ${rating}`);
      }
  }

  private mapPrismaStatusToFsrsState(status: CardStatus): FsrsState {
    switch (status) {
      case CardStatus.new: return FsrsState.New;
      case CardStatus.learning: return FsrsState.Learning;
      case CardStatus.review: return FsrsState.Review;
      case CardStatus.mastered: return FsrsState.Review;
      default: return FsrsState.New;
    }
  }

  private mapFsrsStateToPrismaStatus(state: FsrsState): CardStatus {
    switch (state) {
      case FsrsState.New: return CardStatus.new;
      case FsrsState.Learning: return CardStatus.learning;
      case FsrsState.Review: return CardStatus.review;
      case FsrsState.Relearning: return CardStatus.learning; 
      default: return CardStatus.new;
    }
  }

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
      card.last_review = schedule.last_review || undefined;
      return card;
  }

  private handleError(prefix: string, error: unknown): never {
    console.error(`[CardsService Error - ${prefix}]`, error);
    const messageError = error instanceof Error ? error.message : String(error);
    if (error instanceof ForbiddenException || error instanceof EntityNotFoundException || error instanceof InvalidOperationException || error instanceof BadRequestException) {
        throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(`[CardsService Prisma Error Code - ${prefix}]`, error.code);
        if (error.code === 'P2025') {
             throw new EntityNotFoundException(`Запись не найдена для ${prefix}`, 'N/A');
        }
    }
    throw new InvalidOperationException(`Ошибка при ${prefix}: ${messageError}`);
  }

  private async verifyCardOwner(userId: number, cardId: number): Promise<User> {
    const prefix = `verifyCardOwner (cardId: ${cardId}, userId: ${userId})`;
    try {
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        include: { module: { include: { user: true } } },
      });
      if (!card) throw new EntityNotFoundException('Карточка', cardId);
      if (card.module.user_id !== userId) throw new ForbiddenException('У вас нет доступа к этой карточке');
      return card.module.user;
    } catch (error) {
       this.handleError(prefix, error);
    }
  }

  private async verifyModuleOwner(userId: number, moduleId: number): Promise<void> {
    const prefix = `verifyModuleOwner (moduleId: ${moduleId}, userId: ${userId})`;
    try {
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
        select: { user_id: true },
      });
      if (!module) throw new EntityNotFoundException('Модуль', moduleId);
      if (module.user_id !== userId) throw new ForbiddenException('У вас нет доступа к этому модулю');
    } catch (error) {
      this.handleError(prefix, error);
    }
  }

  async getAllCards(userId: number): Promise<Card[]> {
    try {
      const cards = await this.prisma.card.findMany({
        where: {
          module: {
            user_id: userId,
          },
        },
        include: {
          module: {
            select: {
              title: true,
              language: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
          schedule: true,
        },
      });

      return cards;
    } catch (error) {
      this.handleError(`getAllCards (userId: ${userId})`, error);
    }
  }

  async getCardById(id: number, userId: number): Promise<Card> {
    try {
      await this.verifyCardOwner(userId, id);
      const card = await this.prisma.card.findUnique({
        where: { id },
        include: {
          module: true,
          examples: true,
          schedule: true,
        },
      });

      if (!card) {
        throw new EntityNotFoundException('Карточка', id);
      }

      return card as Card;
    } catch (error) {
      this.handleError(`getCardById (id: ${id}, userId: ${userId})`, error);
    }
  }

  async getCardsByModule(moduleId: number, userId: number): Promise<Card[]> {
    try {
      await this.verifyModuleOwner(userId, moduleId);
      const cards = await this.prisma.card.findMany({
        where: { module_id: moduleId },
        include: {
          schedule: true,
          examples: true,
        },
      });

      return cards;
    } catch (error) {
      this.handleError(`getCardsByModule (moduleId: ${moduleId}, userId: ${userId})`, error);
    }
  }

  async getDueCards(userId: number, moduleId: number): Promise<Card[]> {
    const prefix = `getDueCards (userId: ${userId}, moduleId: ${moduleId})`;
    const now = new Date(); 
    try {
      await this.verifyModuleOwner(userId, moduleId); 

      const dueCards = await this.prisma.card.findMany({
        where: {
          module_id: moduleId,
          module: {
            user_id: userId,
          },
          schedule: {
            due_date: {
              not: null,
              lte: now,
            },
          },
        },
        include: {
          schedule: true, 
          examples: true, 
          module: {
            select: { 
              id: true, 
              title: true,
              language: {
                select: {
                  name: true,
                  code: true
                }
              }
            }
          }
        },
        orderBy: {
          schedule: {
            due_date: 'asc',
          }
        },
      });
      console.log(`[CardsService] ${prefix} - Found ${dueCards.length} due cards.`);
      return dueCards as Card[];
    } catch (error) {
      this.handleError(prefix, error);
    }
  }

  async createCard(createCardDto: CardDto, userId: number): Promise<Card> {
    const prefix = `createCard (userId: ${userId})`;
    try {
        const moduleId = Number(createCardDto.module_id);
        if (isNaN(moduleId)) throw new InvalidOperationException('Некорректный ID модуля');
        await this.verifyModuleOwner(userId, moduleId); 

        const existingCard = await this.prisma.card.findFirst({
            where: { module_id: moduleId, front_text: createCardDto.front_text }
        });
        if (existingCard) {
            throw new InvalidOperationException(`Карточка с текстом "${createCardDto.front_text}" уже существует.`);
        }

        const createdCardWithRelations = await this.prisma.$transaction(async (prisma) => {
            const card = await prisma.card.create({
                data: {
                    module_id: moduleId,
                    front_text: createCardDto.front_text,
                    back_text: createCardDto.back_text,
                    image_url: createCardDto.image_url || null,
                    tts_audio_url: createCardDto.tts_audio_url || null,
                },
            });

            const now = new Date();
            const initialFsrsCard = createEmptyCard(now);
            await prisma.cardSchedule.create({
                data: { 
                    card_id: card.id, 
                    status: this.mapFsrsStateToPrismaStatus(initialFsrsCard.state),
                    difficulty: initialFsrsCard.difficulty,
                    stability: initialFsrsCard.stability,
                    review_count: initialFsrsCard.reps,
                    lapses: initialFsrsCard.lapses,
                    last_review: null,
                    due_date: initialFsrsCard.due,
                    learning_step: 0,
                 }
            });
            return prisma.card.findUniqueOrThrow({
                where: { id: card.id },
                include: { module: true, schedule: true, examples: true }
            });
        });

        console.log(`[CardsService] Card created successfully with ID: ${createdCardWithRelations.id}`);
        return createdCardWithRelations as Card;
    } catch (error) {
        this.handleError(prefix, error);
    }
  }

  async updateCard(id: number, updateCardDto: CardDto, userId: number): Promise<Card> {
    try {
      await this.verifyCardOwner(userId, id);
      const card = await this.prisma.card.findUnique({
        where: { id },
        include: { module: true },
      });

      if (!card) {
        throw new EntityNotFoundException('Карточка', id);
      }

      const moduleId = parseInt(updateCardDto.module_id, 10);
      
      if (moduleId !== card.module_id) {
        const newModule = await this.prisma.module.findUnique({
          where: { id: moduleId },
        });

        if (!newModule) {
          throw new EntityNotFoundException('Модуль', moduleId);
        }

        if (newModule.user_id !== userId) {
          throw new ForbiddenException('У вас нет доступа к этому модулю');
        }
      }

      if (updateCardDto.front_text !== card.front_text) {
        const existingCard = await this.prisma.card.findFirst({
          where: {
            module_id: moduleId,
            front_text: updateCardDto.front_text,
            id: { not: id },
          },
        });

        if (existingCard) {
          throw new InvalidOperationException(`Карточка с текстом "${updateCardDto.front_text}" уже существует в этом модуле`);
        }
      }

      const updatedCard = await this.prisma.card.update({
        where: { id },
        data: {
          module_id: moduleId,
          front_text: updateCardDto.front_text,
          back_text: updateCardDto.back_text,
          image_url: updateCardDto.image_url,
          tts_audio_url: updateCardDto.tts_audio_url,
        },
        include: {
          module: true,
          schedule: true,
          examples: true,
        },
      });

      return updatedCard as Card;
    } catch (error) {
      this.handleError(`updateCard (id: ${id}, userId: ${userId})`, error);
    }
  }

  async deleteCard(id: number, userId: number): Promise<void> {
    console.warn('deleteCard - STUB');
    await this.verifyCardOwner(userId, id);
      }

  async deleteAllCardsByModule(moduleId: number, userId: number): Promise<{ count: number }> {
     console.warn('deleteAllCardsByModule - STUB');
     await this.verifyModuleOwner(userId, moduleId);
          return { count: 0 };
  }

  async searchCards(query: string, userId: number): Promise<Card[]> {
     console.warn('searchCards - STUB');
          return [];
  }

  async getCardsByStatus(moduleId: number, status: CardStatus, date: string | undefined, userId: number): Promise<Card[]> {
     console.warn('getCardsByStatus - STUB');
          return [];
  }

  async reviewCard(cardId: number, reviewDto: ReviewDto, userId: number): Promise<Card> {
    const prefix = `reviewCard (cardId: ${cardId}, userId: ${userId})`;
    const now = new Date();
    try {
      const user = await this.verifyCardOwner(userId, cardId);

      const currentSchedule = await this.prisma.cardSchedule.findUnique({
        where: { card_id: cardId },
      });
      if (!currentSchedule) {
           throw new InvalidOperationException(`Расписание для карточки ${cardId} не найдено.`); 
      }

      let fsrsParams: FSRSParameters;
      if (user.fsrsParams && typeof user.fsrsParams === 'object' && !Array.isArray(user.fsrsParams) && Object.keys(user.fsrsParams).length > 0) {
          fsrsParams = user.fsrsParams as unknown as FSRSParameters;
          console.log(`[FSRS] Using custom params for user ${userId}`);
      } else {
          fsrsParams = generatorParameters();
          console.log(`[FSRS] Using default params for user ${userId}`);
      }
      
      const fsrs = new FSRS(fsrsParams);

      const fsrsCard = this.createFsrsCardFromSchedule(currentSchedule, now);
      const fsrsRating = this.getFsrsRating(reviewDto.rating);
      const prismaRating = this.getPrismaReviewRating(reviewDto.rating);
      
      const result = fsrs.repeat(fsrsCard, now);
      const nextState = result[fsrsRating];

      if (!nextState) {
          throw new Error('FSRS calculation failed to return next state.');
      }

      const updatedCard = await this.prisma.$transaction(async (prisma) => {
            await prisma.cardSchedule.update({
                where: { card_id: cardId },
                data: {
                    stability: nextState.card.stability,
                    difficulty: nextState.card.difficulty,
                    due_date: nextState.card.due,
                    status: this.mapFsrsStateToPrismaStatus(nextState.card.state),
                    review_count: nextState.card.reps,
                    lapses: nextState.card.lapses,
                    last_review: nextState.log.due,
                },
            });

            await prisma.reviewLog.create({
                data: {
                    user_id: userId,
                    card_id: cardId,
                    rating: prismaRating,
                    state: this.mapFsrsStateToPrismaStatus(nextState.log.state),
                    review_date: nextState.log.due,
                }
            });

            return prisma.card.findUniqueOrThrow({
                where: { id: cardId },
                include: { schedule: true, examples: true, module: true }
            });
      });
      
      console.log(`[CardsService] Card ${cardId} reviewed with rating ${reviewDto.rating}. New due date: ${nextState.card.due.toISOString()}`);
      return updatedCard as Card;

    } catch (error) {
      this.handleError(prefix, error);
    }
  }

  async resetCardProgress(cardId: number, userId: number): Promise<Card> {
     console.warn('resetCardProgress - STUB');
     await this.verifyCardOwner(userId, cardId);
          const card = await this.getCardById(cardId, userId);
     if (!card) throw new NotFoundException();
     return card;
  }
  
  async uploadImage(id: number, userId: number): Promise<any> {       console.warn('uploadImage - STUB');
      await this.verifyCardOwner(userId, id);
            return { success: false, message: 'Not implemented' };
  }

  async deleteImage(id: number, userId: number): Promise<any> {       console.warn('deleteImage - STUB');
      await this.verifyCardOwner(userId, id);
            return { success: false, message: 'Not implemented' };
  }

  async getCardHistory(cardId: number, userId: number): Promise<{ schedule: CardSchedule | null, history: ReviewLog[] }> {
    const prefix = `getCardHistory (cardId: ${cardId}, userId: ${userId})`;
    try {
      await this.verifyCardOwner(userId, cardId);

      const schedule = await this.prisma.cardSchedule.findUnique({
        where: { card_id: cardId },
      });

      const history = await this.prisma.reviewLog.findMany({
        where: {
          card_id: cardId,
          user_id: userId, 
        },
        orderBy: {
          review_date: 'asc',
        },
      });

      console.log(`[CardsService] ${prefix} - Found schedule: ${!!schedule}, history logs: ${history.length}`);
      return { schedule, history };

    } catch (error) {
      this.handleError(prefix, error);
    }
  }

  private async _checkCardOwnership(cardId: number, userId: number): Promise<void> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { module: { select: { user_id: true } } },
    });

    if (!card) {
      throw new EntityNotFoundException('Карточка', cardId);
    }
    if (card.module.user_id !== userId) {
      throw new ForbiddenException('У вас нет доступа к этой карточке');
    }
  }
  
  async predictSchedule(cardId: number, userId: number, steps: number = 6) {
    await this._checkCardOwnership(cardId, userId);

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { schedule: true },
    });

    if (!card) {
      throw new EntityNotFoundException('Карточка', cardId);
    }

    let schedule: CardSchedule | null = card.schedule;
    let scheduleData: Omit<CardSchedule, 'id' | 'card' | 'card_id'>;

    if (!schedule) {
      const initial = this.fsrsService.initialStatus();
      scheduleData = {
          status: initial.status ?? CardStatus.new,
          difficulty: initial.difficulty ?? 0,
          stability: initial.stability ?? 0,
          review_count: initial.review_count ?? 0,
          lapses: initial.lapses ?? 0,
          last_review: initial.last_review ? new Date(initial.last_review) : null,
          due_date: initial.due_date ? new Date(initial.due_date) : new Date(),
          learning_step: initial.learning_step ?? 0,
      };
    } else {
      scheduleData = {
          status: schedule.status,
          difficulty: schedule.difficulty,
          stability: schedule.stability,
          review_count: schedule.review_count,
          lapses: schedule.lapses,
          last_review: schedule.last_review,
          due_date: schedule.due_date,
          learning_step: schedule.learning_step,
      }
    }

    return this.fsrsService.predictSchedule(
      scheduleData.status,
      scheduleData.stability,
      scheduleData.difficulty,
      scheduleData.review_count,
      scheduleData.lapses,
      scheduleData.learning_step,
      scheduleData.last_review,
      scheduleData.due_date,
      steps
    );
  }
}
