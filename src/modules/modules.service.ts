import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleDto } from './dto/module.dto';
import { EntityNotFoundException, InvalidOperationException } from '../common/exceptions/business.exceptions';

@Injectable()
export class ModulesService {

  constructor(private prisma: PrismaService) {}

  async getLanguages() {
    console.log('[ModulesService] Attempting to fetch languages from DB...');
    try {
      const languages = await this.prisma.language.findMany({
        orderBy: { name: 'asc' },
      });
      console.log(`[ModulesService] Found ${languages.length} languages.`);
      return languages;
    } catch (error) {
      console.error('[ModulesService] Error fetching languages from DB:', error);
      throw new InvalidOperationException('Не удалось получить список языков');
    }
  }

  async getModuleById(id: number, userId: number) {
    try {
      const module = await this.prisma.module.findUnique({
        where: { id },
        include: {
          language: true,
        },
      });

      if (!module) {
        throw new EntityNotFoundException('Модуль', id);
      }

      // Проверка принадлежности модуля пользователю
      if (module.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этому модулю');
      }

      return module;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof EntityNotFoundException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось получить модуль');
    }
  }

  async getModulesByUser(userId: number) {
    try {
      const modules = await this.prisma.module.findMany({
        where: { user_id: userId },
        include: {
          language: true,
          cards: {
            select: {
              id: true
            }
          },
        },
        orderBy: { created_at: 'desc' },
      });

      // Добавляем количество карточек в каждый модуль
      const modulesWithCardCount = modules.map(module => ({
        ...module,
        card_count: module.cards.length,
        cards: undefined // Удаляем массив карточек, так как нам нужно только количество
      }));

      return modulesWithCardCount;
    } catch (error) {
      throw new InvalidOperationException('Не удалось получить модули пользователя');
    }
  }

  async createModule(createModuleDto: ModuleDto & { user_id: number }) {
    console.log('[ModulesService] Attempting to create module with DTO:', JSON.stringify(createModuleDto, null, 2));
    try {
      // Явная проверка обязательных полей
      if (!createModuleDto.title || typeof createModuleDto.title !== 'string' || createModuleDto.title.trim() === '') {
        console.error('[ModulesService] Invalid title:', createModuleDto.title);
        throw new InvalidOperationException('Название модуля не может быть пустым');
      }
      if (createModuleDto.language_id === undefined || createModuleDto.language_id === null) {
        console.error('[ModulesService] Missing language_id');
        throw new InvalidOperationException('Необходимо указать язык модуля');
      }
      if (createModuleDto.user_id === undefined || createModuleDto.user_id === null) {
        console.error('[ModulesService] Missing user_id');
        throw new InvalidOperationException('Не удалось определить пользователя'); // Эта проверка может быть избыточной, если user_id всегда приходит из контроллера
      }

      // Преобразование и проверка language_id
      const languageId = Number(createModuleDto.language_id);
      if (isNaN(languageId)) {
        console.error('[ModulesService] Invalid language ID (NaN):', createModuleDto.language_id);
        throw new InvalidOperationException('Недопустимый ID языка');
      }
      console.log('[ModulesService] Checking language ID:', languageId);

      const language = await this.prisma.language.findUnique({
        where: { id: languageId },
      });

      if (!language) {
        console.error('[ModulesService] Language not found for ID:', languageId);
        throw new EntityNotFoundException('Язык', languageId);
      }
      console.log('[ModulesService] Language found:', language.name);

      // Проверка user_id (приходит как number из контроллера)
      const userId = createModuleDto.user_id;
      console.log('[ModulesService] Using user ID:', userId);
      
      // Проверка существования пользователя (опционально, но рекомендуется)
      // const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
      // if (!userExists) {
      //   console.error('[ModulesService] User not found for ID:', userId);
      //   throw new EntityNotFoundException('Пользователь', userId);
      // }

      const dataToCreate = {
        title: createModuleDto.title.trim(), // Обрезаем пробелы
        description: createModuleDto.description,
        language_id: languageId, // Используем проверенный числовой ID
        user_id: userId,         // Используем проверенный числовой ID
      };
      console.log('[ModulesService] Data prepared for Prisma:', JSON.stringify(dataToCreate, null, 2));

      // Создание модуля
      const createdModule = await this.prisma.module.create({
        data: dataToCreate,
        include: {
          language: true,
        },
      });
      console.log('[ModulesService] Module created successfully with ID:', createdModule.id);

      return createdModule;

    } catch (error) {
      console.error('[ModulesService] Error creating module:', error);
      
      // Обработка известных бизнес-ошибок
      if (error instanceof EntityNotFoundException || error instanceof InvalidOperationException) {
        throw error;
      }
      
      // Обработка ошибок Prisma
      if (error.code) { // У ошибок Prisma есть код
        console.error('[ModulesService] Prisma error code:', error.code);
        if (error.code === 'P2002') { // Код для нарушения UNIQUE constraint
           throw new InvalidOperationException(`Модуль с таким названием уже существует (или другое уникальное поле).`);
        }
        if (error.code === 'P2003') { // Код для нарушения foreign key constraint
           throw new InvalidOperationException(`Указанный язык или пользователь не существует в базе данных.`);
        }
        // Добавить обработку других кодов Prisma по необходимости
      }
      
      // Общая ошибка
      throw new InvalidOperationException('Не удалось создать модуль' + (error.message ? `: ${error.message}` : ''));
    }
  }

  async updateModule(id: number, updateModuleDto: ModuleDto, userId: number) {
    try {
      // Проверка существования модуля и прав доступа
      const existingModule = await this.prisma.module.findUnique({
        where: { id },
      });

      if (!existingModule) {
        throw new EntityNotFoundException('Модуль', id);
      }

      if (existingModule.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этому модулю');
      }

      // Проверка существования языка, если он меняется
      if (updateModuleDto.language_id !== undefined && updateModuleDto.language_id !== null) {
        const language = await this.prisma.language.findUnique({
          where: { id: updateModuleDto.language_id }, 
        });

        if (!language) {
          console.error('[ModulesService] Update failed: Language not found for ID:', updateModuleDto.language_id);
          throw new EntityNotFoundException('Язык', updateModuleDto.language_id);
        }
      }

      // Обновление модуля
      const updatedModule = await this.prisma.module.update({
        where: { id },
        data: {
          title: updateModuleDto.title,
          description: updateModuleDto.description,
          language_id: updateModuleDto.language_id, 
        },
        include: {
          language: true,
        },
      });

      return updatedModule;
    } catch (error) {
      if (error instanceof EntityNotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось обновить модуль');
    }
  }

  async deleteModule(id: number, userId: number): Promise<void> {
    try {
      // Проверка существования модуля и прав доступа
      const existingModule = await this.prisma.module.findUnique({
        where: { id },
      });

      if (!existingModule) {
        throw new EntityNotFoundException('Модуль', id);
      }

      if (existingModule.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этому модулю');
      }

      // Удаление всех карточек и связанных данных
      await this.prisma.$transaction(async (prisma) => {
        // Находим все карточки модуля
        const cards = await prisma.card.findMany({
          where: { module_id: id },
          select: { id: true },
        });

        const cardIds = cards.map(card => card.id);

        // Удаляем примеры, связанные с карточками
        if (cardIds.length > 0) {
          await prisma.example.deleteMany({
            where: { card_id: { in: cardIds } },
          });

          // Удаляем логи повторений
          await prisma.reviewLog.deleteMany({
            where: { card_id: { in: cardIds } },
          });

          // Удаляем карточки
          await prisma.card.deleteMany({
            where: { module_id: id },
          });
        }

        // Удаляем модуль
        await prisma.module.delete({
          where: { id },
        });
      });

      return;
    } catch (error) {
      if (error instanceof EntityNotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось удалить модуль');
    }
  }

  async getModuleStats(id: number, userId: number) {
    try {
      // Проверка существования модуля и прав доступа
      const module = await this.prisma.module.findUnique({
        where: { id },
      });

      if (!module) {
        throw new EntityNotFoundException('Модуль', id);
      }

      if (module.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этому модулю');
      }

      // Получаем все карточки модуля
      const cards = await this.prisma.card.findMany({
        where: { module_id: id },
        include: {
          schedule: true,
        },
      });

      // Статистика
      const totalCards = cards.length;
      let newCards = 0;
      let learningCards = 0;
      let reviewCards = 0;
      let dueCards = 0;

      // Текущая дата для сравнения
      const now = new Date();

      for (const card of cards) {
        if (card.schedule) {
          switch (card.schedule.status) {
            case 'new':
              newCards++;
              break;
            case 'learning':
              learningCards++;
              // Если карточка в обучении и срок повторения наступил, добавляем к просроченным
              if (card.schedule.due_date && new Date(card.schedule.due_date) <= now) {
                dueCards++;
              }
              break;
            case 'review':
              reviewCards++;
              // Если карточка на повторении и срок повторения наступил, добавляем к просроченным
              if (card.schedule.due_date && new Date(card.schedule.due_date) <= now) {
                dueCards++;
              }
              break;
            default:
              break;
          }
        } else {
          // Если расписания нет, считаем карточку новой
          newCards++;
        }
      }

      // Получаем статистику последних повторений
      const lastReviews = await this.prisma.reviewLog.findMany({
        where: {
          card: {
            module_id: id,
          },
        },
        orderBy: {
          review_date: 'desc',
        },
        take: 10,
        include: {
          card: {
            select: {
              front_text: true,
              back_text: true,
            },
          },
        },
      });

      return {
        totalCards,
        newCards,
        learningCards,
        reviewCards,
        dueCards,
        lastReviews: lastReviews.map(review => ({
          id: review.id,
          cardId: review.card_id,
          frontContent: review.card.front_text,
          backContent: review.card.back_text,
          reviewedAt: review.review_date,
          rating: review.rating,
          state: review.state,
        })),
      };
    } catch (error) {
      if (error instanceof EntityNotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось получить статистику модуля');
    }
  }

  async getDailyStats(id: number, userId: number, fromDate?: string, toDate?: string) {
    try {
      // Проверка существования модуля и прав доступа
      const module = await this.prisma.module.findUnique({
        where: { id },
      });

      if (!module) {
        throw new EntityNotFoundException('Модуль', id);
      }

      if (module.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этому модулю');
      }

      // Обработка дат
      const startDate = fromDate ? new Date(fromDate) : new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = toDate ? new Date(toDate) : new Date();

      // Устанавливаем конец дня для endDate
      endDate.setHours(23, 59, 59, 999);

      // Получаем логи повторений за указанный период
      const reviewLogs = await this.prisma.reviewLog.findMany({
        where: {
          card: {
            module_id: id,
          },
          review_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          review_date: 'asc',
        },
      });

      // Группируем по датам
      const dailyStats = {};
      
      reviewLogs.forEach(log => {
        const date = log.review_date.toISOString().split('T')[0]; // Форматируем дату как YYYY-MM-DD
        
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            totalReviews: 0,
            ratings: { again: 0, hard: 0, good: 0, easy: 0 },
          };
        }
        
        dailyStats[date].totalReviews++;
        
        // Подсчет по рейтингам
        switch (log.rating) {
          case 'again': dailyStats[date].ratings.again++; break;
          case 'hard': dailyStats[date].ratings.hard++; break;
          case 'good': dailyStats[date].ratings.good++; break;
          case 'easy': dailyStats[date].ratings.easy++; break;
        }
      });

      // Преобразуем в массив и сортируем по дате
      const result = Object.values(dailyStats).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return result;
    } catch (error) {
      if (error instanceof EntityNotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось получить ежедневную статистику');
    }
  }
}
