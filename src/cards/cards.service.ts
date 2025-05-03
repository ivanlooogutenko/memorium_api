import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardDto } from './dto/card.dto';
import { ReviewDto } from './dto/review.dto';
import { CardStatus, Prisma, Card, ReviewRating as PrismaReviewRating, CardSchedule, User, ReviewLog, Example } from '@prisma/client';
import { FSRS, Card as FsrsCard, ReviewLog as FsrsReviewLog, State as FsrsState, Rating as FsrsRating, FSRSParameters, generatorParameters, createEmptyCard } from 'ts-fsrs';
import { EntityNotFoundException, InvalidOperationException } from '../common/exceptions/business.exceptions';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { FsrsService, CalculatedReviewResult } from './fsrs.service';

// Интервалы обучения в минутах
const LEARNING_STEP_1_INTERVAL_MINUTES = 1;
const LEARNING_STEP_2_INTERVAL_MINUTES = 10;
const LEARNING_STEP_HARD_FACTOR = 0.5; // Множитель для интервала при оценке "Hard"

// Интервалы в минутах
const SHORT_INTERVAL_MINUTES = 1;
const LEARNING_INTERVAL_NEW_OR_AGAIN_MINUTES = 1;
const LEARNING_INTERVAL_HARD_MINUTES = 1;
const LEARNING_INTERVAL_GOOD_STEP_2_MINUTES = 10; // Интервал после первого Good

// Helper function to check if two dates are on the same day (ignores time)
const isSameDay = (date1: Date | null | undefined, date2: Date | null | undefined): boolean => {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

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
      if (schedule.last_review) {
         card.last_review = schedule.last_review;
      }
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
      if (!card.module) throw new InvalidOperationException('Карточка не привязана к модулю');
      if (card.module.user_id !== userId) throw new ForbiddenException('У вас нет доступа к этой карточке');
      if (!card.module.user) throw new InvalidOperationException('Не удалось загрузить данные пользователя для карточки');
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
    // Рассчитываем начало следующего дня (00:00:00.000)
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

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
              lt: tomorrowStart, // Используем 'lt' (less than) с началом следующего дня
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

  async createCard(createCardDto: CardDto, userId: number): Promise<Card & { examples: Example[] }> {
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
            // 1. Создаем карточку
            const card = await prisma.card.create({
                data: {
                    module_id: moduleId,
                    front_text: createCardDto.front_text,
                    back_text: createCardDto.back_text,
                    image_url: createCardDto.image_url || null,
                    tts_audio_url: createCardDto.tts_audio_url || null,
                },
            });

            // 2. Создаем расписание для карточки
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
                    consecutiveGoodCount: 0,
                    lastAnsweredGoodDate: null
                 }
            });

            // 3. Создаем примеры, если они переданы
            let createdExamples: Example[] = [];
            if (createCardDto.examples && createCardDto.examples.length > 0) {
                const exampleData = createCardDto.examples.map((ex, index) => ({
                    card_id: card.id,
                    example_text: ex.example_text,
                    translation_text: ex.translation_text || null,
                    example_order: index + 1,
                }));
                await prisma.example.createMany({
                    data: exampleData,
                });
                // Получаем созданные примеры для возврата
                createdExamples = await prisma.example.findMany({
                    where: { card_id: card.id },
                    orderBy: { example_order: 'asc' }
                });
            }

            // 4. Получаем полную карточку с связями для возврата
            // Используем findUniqueOrThrow чтобы убедиться, что карточка существует
            const fullCard = await prisma.card.findUniqueOrThrow({
                where: { id: card.id },
                include: { module: true, schedule: true } // Примеры уже получены
            });

            // Объединяем данные карточки и примеры
            return { ...fullCard, examples: createdExamples };
        });

        console.log(`[CardsService] Card created successfully with ID: ${createdCardWithRelations.id} and ${createdCardWithRelations.examples.length} examples.`);
        return createdCardWithRelations;
    } catch (error) {
        // Логируем ошибку перед тем как перебросить ее
        console.error(`[CardsService Error - ${prefix}]`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Обработка уникального ограничения (например, module_id + front_text)
             throw new InvalidOperationException(`Карточка с текстом "${createCardDto.front_text}" уже существует в этом модуле.`);
        }
        // Перебрасываем другие обработанные ошибки или генерируем InvalidOperationException
        this.handleError(prefix, error);
    }
  }

  async updateCard(id: number, updateCardDto: CardDto, userId: number): Promise<Card & { examples: Example[] }> {
    const prefix = `updateCard (id: ${id}, userId: ${userId})`;
    try {
        await this.verifyCardOwner(userId, id);
        const card = await this.prisma.card.findUnique({
            where: { id },
            include: { module: true, examples: true }, // Включаем существующие примеры
        });

        if (!card) {
            throw new EntityNotFoundException('Карточка', id);
        }

        const moduleId = parseInt(updateCardDto.module_id, 10);

        if (moduleId !== card.module_id) {
            // Проверка прав на новый модуль
            const newModule = await this.prisma.module.findUnique({ where: { id: moduleId } });
            if (!newModule) throw new EntityNotFoundException('Модуль', moduleId);
            if (newModule.user_id !== userId) throw new ForbiddenException('У вас нет доступа к этому модулю');
        }

        // Проверка уникальности front_text в НОВОМ модуле (если текст или модуль изменились)
        if (updateCardDto.front_text !== card.front_text || moduleId !== card.module_id) {
            const existingCard = await this.prisma.card.findFirst({
                where: {
                    module_id: moduleId,
                    front_text: updateCardDto.front_text,
                    id: { not: id }, // Исключаем текущую карточку
                },
            });
            if (existingCard) {
                throw new InvalidOperationException(`Карточка с текстом "${updateCardDto.front_text}" уже существует в модуле ID ${moduleId}`);
            }
        }

        const updatedCardWithRelations = await this.prisma.$transaction(async (prisma) => {
            // 1. Обновляем основные данные карточки
            const updatedCardData = await prisma.card.update({
                where: { id },
                data: {
                    module_id: moduleId,
                    front_text: updateCardDto.front_text,
                    back_text: updateCardDto.back_text,
                    image_url: updateCardDto.image_url,
                    tts_audio_url: updateCardDto.tts_audio_url,
                },
                include: { module: true, schedule: true } // Включаем связи
            });

            // 2. Обновляем примеры (удаляем старые, создаем новые)
            // Это самый простой способ гарантировать правильный порядок и данные
            await prisma.example.deleteMany({ where: { card_id: id } });

            let updatedExamples: Example[] = [];
            if (updateCardDto.examples && updateCardDto.examples.length > 0) {
                const exampleData = updateCardDto.examples.map((ex, index) => ({
                    card_id: id,
                    example_text: ex.example_text,
                    translation_text: ex.translation_text || null,
                    example_order: index + 1,
                }));
                await prisma.example.createMany({
                    data: exampleData,
                });
                // Получаем обновленные примеры для возврата
                updatedExamples = await prisma.example.findMany({
                    where: { card_id: id },
                    orderBy: { example_order: 'asc' }
                });
            }

            // Объединяем обновленные данные карточки и примеры
            return { ...updatedCardData, examples: updatedExamples };
        });

        console.log(`[CardsService] Card updated successfully ID: ${updatedCardWithRelations.id} with ${updatedCardWithRelations.examples.length} examples.`);
        return updatedCardWithRelations;
    } catch (error) {
        this.handleError(prefix, error);
    }
  }

  async deleteCard(id: number, userId: number): Promise<void> {
    const prefix = `deleteCard (id: ${id}, userId: ${userId})`;
    try {
      await this.verifyCardOwner(userId, id);
      
      await this.prisma.$transaction([
        this.prisma.cardSchedule.deleteMany({ where: { card_id: id } }),
        this.prisma.reviewLog.deleteMany({ where: { card_id: id } }),
        this.prisma.card.delete({ where: { id } }),
      ]);

      console.log(`[CardsService] ${prefix} - Card deleted successfully.`);

    } catch (error) {
      this.handleError(prefix, error);
    }
  }

  async deleteAllCardsByModule(moduleId: number, userId: number): Promise<{ count: number }> {
    const prefix = `deleteAllCardsByModule (moduleId: ${moduleId}, userId: ${userId})`;
    try {
      await this.verifyModuleOwner(userId, moduleId);

      const cardsToDelete = await this.prisma.card.findMany({
        where: { module_id: moduleId },
        select: { id: true },
      });
      const cardIds = cardsToDelete.map(card => card.id);

      if (cardIds.length === 0) {
        return { count: 0 };
      }

      const result = await this.prisma.$transaction([
        this.prisma.cardSchedule.deleteMany({ where: { card_id: { in: cardIds } } }),
        this.prisma.reviewLog.deleteMany({ where: { card_id: { in: cardIds } } }),
        this.prisma.card.deleteMany({ where: { id: { in: cardIds } } }),
      ]);

      const deletedCount = result[result.length - 1].count;
      console.log(`[CardsService] ${prefix} - Deleted ${deletedCount} cards.`);
      return { count: deletedCount };

    } catch (error) {
      this.handleError(prefix, error);
    }
  }

  async searchCards(query: string, userId: number): Promise<Card[]> {
    const prefix = `searchCards (query: ${query}, userId: ${userId})`;
    try {
      const cards = await this.prisma.card.findMany({
        where: {
          module: {
            user_id: userId,
          },
          OR: [
            { front_text: { contains: query, mode: 'insensitive' } },
            { back_text: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          module: { select: { id: true, title: true } },
          schedule: true, 
        },
        orderBy: { created_at: 'desc' }, 
        take: 50,
      });
      console.log(`[CardsService] ${prefix} - Found ${cards.length} cards.`);
      return cards as Card[];
    } catch (error) {
      this.handleError(prefix, error);
    }
  }

  async getCardsByStatus(moduleId: number, status: CardStatus, date: string | undefined, userId: number): Promise<Card[]> {
    const prefix = `getCardsByStatus (moduleId: ${moduleId}, status: ${status}, date: ${date}, userId: ${userId})`;
    try {
      await this.verifyModuleOwner(userId, moduleId);
      const whereCondition: Prisma.CardWhereInput = {
        module_id: moduleId,
        schedule: {
          status: status,
        },
      };

      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        if (whereCondition.schedule) {
          whereCondition.schedule.due_date = {
            gte: startDate,
            lte: endDate,
          };
        }
      }

      const cards = await this.prisma.card.findMany({
        where: whereCondition,
        include: {
          module: { select: { id: true, title: true } },
          schedule: true,
        },
        orderBy: { schedule: { due_date: 'asc' } },
      });
      console.log(`[CardsService] ${prefix} - Found ${cards.length} cards.`);
      return cards as Card[];
    } catch (error) {
      this.handleError(prefix, error);
    }
  }

  async reviewCard(cardId: number, reviewDto: ReviewDto, userId: number): Promise<Card> {
    const prefix = `reviewCard (cardId: ${cardId}, userId: ${userId})`;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    try {
      const user = await this.verifyCardOwner(userId, cardId);
      let currentSchedule = await this.prisma.cardSchedule.findUnique({
        where: { card_id: cardId },
      });

      if (!currentSchedule) {
        console.warn(`[${prefix}] Schedule not found for card ${cardId}. Creating initial schedule.`);
        const initialData = this.fsrsService.initialStatus();
        currentSchedule = await this.prisma.cardSchedule.create({ data: { card_id: cardId, ...initialData } });
      }

      const fsrsRating = this.getFsrsRating(reviewDto.rating);
      const prismaRating = this.getPrismaReviewRating(reviewDto.rating);

      let scheduleUpdateData: Prisma.CardScheduleUpdateInput = {};
      const statusBeforeReview = currentSchedule.status; // Сохраняем статус ДО ревью для лога
      let logRating: PrismaReviewRating = prismaRating;
      let countsTowardsGoal = false; // Инициализируем флаг

      const consecutiveGoodCount = currentSchedule.consecutiveGoodCount || 0;
      const lastAnsweredGoodDate = currentSchedule.lastAnsweredGoodDate;
      let nextConsecutiveGoodCount = 0;
      let nextLastAnsweredGoodDate: Date | null = null;

      switch (currentSchedule.status) {
        case CardStatus.new:
          if (fsrsRating === FsrsRating.Again) {
            scheduleUpdateData = {
              due_date: todayStart, // Остается due сегодня
              last_review: now,
              consecutiveGoodCount: 0,
              lastAnsweredGoodDate: null,
            };
          } else { // Hard, Good, Easy
            nextConsecutiveGoodCount = (fsrsRating === FsrsRating.Good || fsrsRating === FsrsRating.Easy) ? 1 : 0;
            nextLastAnsweredGoodDate = nextConsecutiveGoodCount === 1 ? now : null;
            scheduleUpdateData = {
              status: CardStatus.learning,
              learning_step: 1,
              due_date: todayStart, // Сразу доступна для изучения сегодня
              last_review: now,
              review_count: 1,
              lapses: 0,
              consecutiveGoodCount: nextConsecutiveGoodCount,
              lastAnsweredGoodDate: nextLastAnsweredGoodDate,
            };
          }
          break;

        case CardStatus.learning:
          nextConsecutiveGoodCount = consecutiveGoodCount;
          nextLastAnsweredGoodDate = lastAnsweredGoodDate;

          if (fsrsRating === FsrsRating.Good || fsrsRating === FsrsRating.Easy) {
            if (isSameDay(lastAnsweredGoodDate, now)) {
              nextConsecutiveGoodCount += 1;
            } else {
              nextConsecutiveGoodCount = 1;
            }
            nextLastAnsweredGoodDate = now;

            if (nextConsecutiveGoodCount >= 3) {
              // Переход в review
              console.log(`[CardsService] Card ${cardId} graduating from learning.`);
              const { scheduleUpdateData: fsrsUpdate, logData: fsrsLog } = 
                this.fsrsService.calculateFsrsReview(currentSchedule, fsrsRating, now, user.fsrsParams);
              scheduleUpdateData = { ...fsrsUpdate, consecutiveGoodCount: 0, lastAnsweredGoodDate: null };
              countsTowardsGoal = true;
            } else {
              // Продолжаем learning, остается due сегодня
              scheduleUpdateData = {
                learning_step: nextConsecutiveGoodCount,
                due_date: todayStart, // Остается due сегодня
                last_review: now,
                review_count: (currentSchedule.review_count || 0) + 1,
                consecutiveGoodCount: nextConsecutiveGoodCount,
                lastAnsweredGoodDate: nextLastAnsweredGoodDate,
              };
            }
          } else { // Again or Hard
            scheduleUpdateData = {
              learning_step: 1, // Сброс шага
              due_date: todayStart, // Остается due сегодня
              lapses: (fsrsRating === FsrsRating.Again) ? (currentSchedule.lapses || 0) + 1 : currentSchedule.lapses,
              last_review: now,
              review_count: (currentSchedule.review_count || 0) + 1,
              consecutiveGoodCount: 0,
              lastAnsweredGoodDate: null,
            };
          }
          break;

        case CardStatus.review:
        case CardStatus.mastered:
          const { scheduleUpdateData: fsrsUpdate, logData: fsrsLog } = 
            this.fsrsService.calculateFsrsReview(currentSchedule, fsrsRating, now, user.fsrsParams);
          scheduleUpdateData = { ...fsrsUpdate, consecutiveGoodCount: 0, lastAnsweredGoodDate: null };
          
          // Засчитываем, если ответ Good или Easy
          if (fsrsRating === FsrsRating.Good || fsrsRating === FsrsRating.Easy) {
              countsTowardsGoal = true;
          }
          break;

        default:
          const { scheduleUpdateData: defaultUpdate, logData: defaultLog } = 
            this.fsrsService.calculateFsrsReview(currentSchedule, fsrsRating, now, user.fsrsParams);
          scheduleUpdateData = { ...defaultUpdate, consecutiveGoodCount: 0, lastAnsweredGoodDate: null };
          if (fsrsRating === FsrsRating.Good || fsrsRating === FsrsRating.Easy) {
              countsTowardsGoal = true;
          }
          break;
      }

      // --- Сохранение результатов --- 
      const [updatedSchedule, reviewLog] = await this.prisma.$transaction([
         this.prisma.cardSchedule.update({
          where: { card_id: cardId },
          data: scheduleUpdateData,
        }),
         this.prisma.reviewLog.create({
          data: {
            user_id: userId,
            card_id: cardId,
            rating: prismaRating,
            state: statusBeforeReview,
            review_date: now,
            countsTowardsGoal: countsTowardsGoal,
          },
        })
      ]);

       // Возвращаем обновленную карточку целиком
      const updatedCard = await this.prisma.card.findUniqueOrThrow({
          where: { id: cardId },
          include: { schedule: true, examples: true, module: true },
      });

      console.log(`[CardsService] ${prefix} - Card reviewed. Counts towards goal: ${countsTowardsGoal}. New status: ${updatedSchedule.status}`);
      return updatedCard as Card;

    } catch (error) {
      this.handleError(prefix, error);
    }
  }

  async resetCardProgress(cardId: number, userId: number): Promise<Card> {
    const prefix = `resetCardProgress (cardId: ${cardId}, userId: ${userId})`;
    try {
      await this.verifyCardOwner(userId, cardId);
      
      const initialScheduleData = this.fsrsService.initialStatus(); 

      const updatedCard = await this.prisma.$transaction(async (prisma) => {
          // Используем update вместо upsert, т.к. currentSchedule уже есть или создался в reviewCard
          await prisma.cardSchedule.update({
              where: { card_id: cardId },
              data: {
                  ...initialScheduleData, // Данные из initialStatus
                  consecutiveGoodCount: 0, // Явно сбрасываем новые поля
                  lastAnsweredGoodDate: null,
              },
          });
          
          await prisma.reviewLog.deleteMany({ where: { card_id: cardId } });
          
          return prisma.card.findUniqueOrThrow({
              where: { id: cardId },
              include: { schedule: true, examples: true, module: true }
          });
      });

      console.log(`[CardsService] ${prefix} - Progress reset successfully.`);
      return updatedCard as Card;
      
    } catch (error) {
      this.handleError(prefix, error);
    }
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
  
  /*
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
    // Вызов закомментированного метода
    // return this.fsrsService.predictSchedule(
    //   scheduleData.status,
    //   scheduleData.stability,
    //   scheduleData.difficulty,
    //   scheduleData.review_count,
    //   scheduleData.lapses,
    //   scheduleData.learning_step,
    //   scheduleData.last_review,
    //   scheduleData.due_date,
    //   steps
    // );
     return []; // Возвращаем пустой массив или выбрасываем ошибку
  }
  */
}
