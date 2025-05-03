import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityNotFoundException, InvalidOperationException } from '../common/exceptions/business.exceptions';
import { CardStatus, User } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface WeeklyStatItem {
  date: string;
  reviewsCount: number;
}

// Экспортируем интерфейс
export interface GlobalProgressResponse {
  completedToday: number;
  currentStreak: number;
  maxStreak: number;
}

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getUserSummary(userId: number) {
    try {
      // Получаем общее количество карточек пользователя
      const totalCards = await this.prisma.card.count({
        where: {
          module: {
            user_id: userId,
          },
        },
      });

      // Получаем количество карточек по статусам
      const newCards = await this.prisma.card.count({
        where: {
          module: {
            user_id: userId,
          },
          schedule: {
            status: 'new',
          },
        },
      });

      const learningCards = await this.prisma.card.count({
        where: {
          module: {
            user_id: userId,
          },
          schedule: {
            status: 'learning',
          },
        },
      });

      const reviewCards = await this.prisma.card.count({
        where: {
          module: {
            user_id: userId,
          },
          schedule: {
            status: 'review',
          },
        },
      });

      const masteredCards = await this.prisma.card.count({
        where: {
          module: {
            user_id: userId,
          },
          schedule: {
            status: 'mastered',
          },
        },
      });

      // Получаем количество карточек, которые нужно повторить сегодня
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const dueToday = await this.prisma.card.count({
        where: {
          module: {
            user_id: userId,
          },
          schedule: {
            due_date: {
              lte: today,
            },
            status: {
              in: ['review', 'learning'],
            },
          },
        },
      });

      // Получаем количество модулей
      const modulesCount = await this.prisma.module.count({
        where: {
          user_id: userId,
        },
      });

      // Получаем количество повторений за неделю
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const reviewsLastWeek = await this.prisma.reviewLog.count({
        where: {
          user_id: userId,
          review_date: {
            gte: weekAgo,
          },
        },
      });

      // Получаем общий процент выученных карточек
      const progress = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

      return {
        totalCards,
        newCards,
        learningCards,
        reviewCards,
        masteredCards,
        dueToday,
        modulesCount,
        reviewsLastWeek,
        progress,
      };
    } catch (error) {
      throw new InvalidOperationException(`Ошибка при получении статистики: ${error.message}`);
    }
  }

  async getDailyStats(userId: number, moduleId?: number, fromDate?: Date, toDate?: Date) {
    try {
      // Определяем даты для выборки
      const from = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 дней назад по умолчанию
      const to = toDate || new Date();
      to.setHours(23, 59, 59, 999);

      // Базовые условия для выборки
      const whereCondition: any = {
        user_id: userId,
        review_date: {
          gte: from,
          lte: to,
        },
      };

      // Добавляем фильтр по модулю, если указан
      if (moduleId) {
        whereCondition.card = {
          module_id: moduleId,
        };
      }

      // Получаем все записи повторений за указанный период
      const reviews = await this.prisma.reviewLog.findMany({
        where: whereCondition,
        orderBy: {
          review_date: 'asc',
        },
        include: {
          card: {
            select: {
              module_id: true,
            },
          },
        },
      });

      // Группируем данные по дням
      const dailyData = {};

      // Подготавливаем массив дат в диапазоне
      const dates: string[] = [];
      const currDate = new Date(from);
      while (currDate <= to) {
        const dateString = currDate.toISOString().split('T')[0];
        dates.push(dateString);
        dailyData[dateString] = {
          date: dateString,
          reviewsCount: 0,
          newCount: 0,
          learningCount: 0,
          reviewCount: 0,
          masteredCount: 0,
        };
        currDate.setDate(currDate.getDate() + 1);
      }

      // Заполняем данные по дням
      reviews.forEach(review => {
        const dateString = review.review_date.toISOString().split('T')[0];
        if (dailyData[dateString]) {
          dailyData[dateString].reviewsCount += 1;

          // Увеличиваем счетчик соответствующего статуса
          switch (review.state) {
            case 'new':
              dailyData[dateString].newCount += 1;
              break;
            case 'learning':
              dailyData[dateString].learningCount += 1;
              break;
            case 'review':
              dailyData[dateString].reviewCount += 1;
              break;
            case 'mastered':
              dailyData[dateString].masteredCount += 1;
              break;
          }
        }
      });

      // Преобразуем объект в массив для возврата
      return dates.map(date => dailyData[date]);
    } catch (error) {
      throw new InvalidOperationException(`Ошибка при получении ежедневной статистики: ${error.message}`);
    }
  }

  async getModulesStats(userId: number) {
    try {
      // Получаем все модули пользователя
      const modules = await this.prisma.module.findMany({
        where: {
          user_id: userId,
        },
        include: {
          language: true,
        },
      });

      // Получаем количество карточек в каждом модуле
      const moduleStats = await Promise.all(
        modules.map(async module => {
          // Общее количество карточек
          const totalCards = await this.prisma.card.count({
            where: {
              module_id: module.id,
            },
          });

          // Количество карточек со статусом "new"
          const newCards = await this.prisma.card.count({
            where: {
              module_id: module.id,
              schedule: {
                status: 'new',
              },
            },
          });

          // Количество карточек со статусом "learning"
          const learningCards = await this.prisma.card.count({
            where: {
              module_id: module.id,
              schedule: {
                status: 'learning',
              },
            },
          });

          // Количество карточек со статусом "review"
          const reviewCards = await this.prisma.card.count({
            where: {
              module_id: module.id,
              schedule: {
                status: 'review',
              },
            },
          });

          // Количество карточек со статусом "mastered"
          const masteredCards = await this.prisma.card.count({
            where: {
              module_id: module.id,
              schedule: {
                status: 'mastered',
              },
            },
          });

          // Количество карточек, которые нужно повторить сегодня
          const today = new Date();
          today.setHours(23, 59, 59, 999);

          const dueToday = await this.prisma.card.count({
            where: {
              module_id: module.id,
              schedule: {
                due_date: {
                  lte: today,
                },
                status: {
                  in: ['review', 'learning'],
                },
              },
            },
          });

          // Прогресс изучения в процентах
          const progress = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

          return {
            id: module.id,
            title: module.title,
            language: module.language ? module.language.name : 'Unknown',
            totalCards,
            newCards,
            learningCards,
            reviewCards,
            masteredCards,
            dueToday,
            progress,
          };
        })
      );

      return moduleStats;
    } catch (error) {
      throw new InvalidOperationException(`Ошибка при получении статистики по модулям: ${error.message}`);
    }
  }

  async getModuleStats(userId: number, moduleId: number) {
    try {
      // Проверяем доступ пользователя к модулю
      const module = await this.prisma.module.findUnique({
        where: {
          id: moduleId,
        },
        include: {
          language: true,
        },
      });

      if (!module) {
        throw new EntityNotFoundException('Модуль', moduleId);
      }

      if (module.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этому модулю');
      }

      // Общее количество карточек
      const totalCards = await this.prisma.card.count({
        where: {
          module_id: moduleId,
        },
      });

      // Количество карточек по статусам
      const cardsByStatus = await this.prisma.$queryRaw`
        SELECT 
          cs.status, 
          COUNT(*) as count 
        FROM "CardSchedule" cs
        JOIN "Card" c ON cs.card_id = c.id
        WHERE c.module_id = ${moduleId}
        GROUP BY cs.status
      `;

      // Преобразуем результаты в удобный формат
      const statusMap = {
        new: 0,
        learning: 0,
        review: 0,
        mastered: 0,
      };

      (cardsByStatus as any[]).forEach(item => {
        statusMap[item.status] = parseInt(item.count);
      });

      // Карточки, которые нужно повторить сегодня
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const dueToday = await this.prisma.card.count({
        where: {
          module_id: moduleId,
          schedule: {
            due_date: {
              lte: today,
            },
            status: {
              in: ['review', 'learning'],
            },
          },
        },
      });

      // Статистика по дням для построения графика
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyStats = await this.prisma.reviewLog.groupBy({
        by: ['review_date'],
        where: {
          user_id: userId,
          card: {
            module_id: moduleId,
          },
          review_date: {
            gte: thirtyDaysAgo,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          review_date: 'asc',
        },
      });

      // Формируем массив с данными по дням
      const dailyData: { date: string; count: number }[] = [];
      const currDate = new Date(thirtyDaysAgo);
      
      while (currDate <= today) {
        const dateString = currDate.toISOString().split('T')[0];
        const stat = dailyStats.find(
          s => s.review_date.toISOString().split('T')[0] === dateString
        );
        
        dailyData.push({
          date: dateString,
          count: stat ? stat._count.id : 0,
        });
        
        currDate.setDate(currDate.getDate() + 1);
      }

      // Прогресс изучения в процентах
      const progress = totalCards > 0 ? Math.round((statusMap.mastered / totalCards) * 100) : 0;

      return {
        id: module.id,
        title: module.title,
        language: module.language ? module.language.name : 'Unknown',
        language_id: module.language_id,
        description: module.description,
        created_at: module.created_at,
        totalCards,
        newCards: statusMap.new,
        learningCards: statusMap.learning,
        reviewCards: statusMap.review,
        masteredCards: statusMap.mastered,
        dueToday,
        progress,
        dailyStats: dailyData,
      };
    } catch (error) {
      if (error instanceof EntityNotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InvalidOperationException(`Ошибка при получении статистики модуля: ${error.message}`);
    }
  }

  async getWeeklyStats(userId: number): Promise<WeeklyStatItem[]> {
    const prefix = `getWeeklyStats (userId: ${userId})`;
    console.log(`[StatsService] ${prefix} - Fetching global weekly stats (goal-achieving reviews)...`);
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6); 
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const reviewsGroupedByDay: { review_day: Date, count: bigint }[] = await this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', review_date)::date as review_day, 
          COUNT(*) as count 
        FROM "ReviewLog"
        WHERE 
          user_id = ${userId}
          AND review_date >= ${sevenDaysAgo}
          AND review_date < DATE_TRUNC('day', ${today} + INTERVAL '1 day')
          AND "countsTowardsGoal" = true
        GROUP BY review_day
        ORDER BY review_day ASC
      `;

      console.log(`[StatsService] ${prefix} - Raw grouped reviews from DB ($queryRaw):`, reviewsGroupedByDay);

      const reviewsMap = new Map<string, number>();
      reviewsGroupedByDay.forEach(review => {
        const dateString = review.review_day.toISOString().split('T')[0];
        reviewsMap.set(dateString, Number(review.count));
      });

      const weeklyData: WeeklyStatItem[] = [];
      const currentDate = new Date(sevenDaysAgo);
      for (let i = 0; i < 7; i++) {
        const dateString = currentDate.toISOString().split('T')[0];
        weeklyData.push({
          date: dateString,
          reviewsCount: reviewsMap.get(dateString) || 0, 
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      console.log(`[StatsService] ${prefix} - Returning formatted weekly data:`, JSON.stringify(weeklyData));
      return weeklyData;

    } catch (error) {
      console.error(`[StatsService] Error in ${prefix}:`, error);
      throw new InvalidOperationException(`Ошибка при получении еженедельной статистики: ${error.message}`);
    }
  }

  async getLearningProgress(userId: number) {
    try {
      // Получаем дату регистрации пользователя
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          created_at: true,
        },
      });

      if (!user) {
        throw new EntityNotFoundException('Пользователь', userId);
      }

      // Получаем общее количество карточек пользователя
      const totalCards = await this.prisma.card.count({
        where: {
          module: {
            user_id: userId,
          },
        },
      });

      // Получаем количество выученных карточек (mastered)
      const masteredCards = await this.prisma.card.count({
        where: {
          module: {
            user_id: userId,
          },
          schedule: {
            status: 'mastered',
          },
        },
      });

      // Получаем количество карточек в процессе изучения (review)
      const reviewCards = await this.prisma.card.count({
        where: {
          module: {
            user_id: userId,
          },
          schedule: {
            status: 'review',
          },
        },
      });

      // Получаем количество повторений по месяцам
      const reviewsByMonth = await this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', review_date) as month,
          COUNT(*) as count
        FROM "ReviewLog"
        WHERE user_id = ${userId}
        GROUP BY DATE_TRUNC('month', review_date)
        ORDER BY month
      `;

      // Получаем среднее количество повторений в день
      const daysSinceRegistration = Math.max(
        1,
        Math.floor(
          (new Date().getTime() - user.created_at.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      const totalReviews = await this.prisma.reviewLog.count({
        where: {
          user_id: userId,
        },
      });

      const averageReviewsPerDay = totalReviews / daysSinceRegistration;

      // Прогресс изучения в процентах
      const progress = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

      // Статистика по языкам
      const languageStats = await this.prisma.$queryRaw`
        SELECT 
          l.name as language,
          COUNT(c.id) as total_cards,
          SUM(CASE WHEN cs.status = 'mastered' THEN 1 ELSE 0 END) as mastered_cards
        FROM "Module" m
        JOIN "Language" l ON m.language_id = l.id
        JOIN "Card" c ON c.module_id = m.id
        JOIN "CardSchedule" cs ON cs.card_id = c.id
        WHERE m.user_id = ${userId}
        GROUP BY l.name
      `;

      return {
        totalCards,
        masteredCards,
        reviewCards,
        progress,
        averageReviewsPerDay: parseFloat(averageReviewsPerDay.toFixed(1)),
        reviewsByMonth: (reviewsByMonth as any[]).map(item => ({
          month: item.month,
          count: parseInt(item.count),
        })),
        languageStats: (languageStats as any[]).map(item => ({
          language: item.language,
          totalCards: parseInt(item.total_cards),
          masteredCards: parseInt(item.mastered_cards),
          progress:
            parseInt(item.total_cards) > 0
              ? Math.round((parseInt(item.mastered_cards) / parseInt(item.total_cards)) * 100)
              : 0,
        })),
      };
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      throw new InvalidOperationException(`Ошибка при получении прогресса обучения: ${error.message}`);
    }
  }

  // Метод для проверки, была ли достигнута цель за определенный день
  private async wasGoalAchieved(userId: number, date: Date, dailyGoal: number): Promise<boolean> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const count = await this.prisma.reviewLog.count({
      where: {
        user_id: userId,
        review_date: { gte: start, lte: end },
        countsTowardsGoal: true,
      },
    });
    return count >= dailyGoal;
  }

  // Обновленный метод
  async getGlobalDailyProgress(userId: number): Promise<GlobalProgressResponse> {
    const prefix = `getGlobalDailyProgress (userId: ${userId})`;
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
    const yesterdayEnd = new Date(yesterdayStart); yesterdayEnd.setHours(23, 59, 59, 999);

    console.log(`[StatsService] ${prefix} - Updating streak and fetching progress...`);

    try {
      // 1. Получаем пользователя с нужными полями
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            dailyGoal: true,
            currentStreak: true,
            maxStreak: true,
            lastStreakUpdate: true,
        }
      });
      if (!user) {
          throw new EntityNotFoundException('Пользователь', userId);
      }
      const dailyGoal = user.dailyGoal;

      // 2. Получаем прогресс за сегодня
      const completedToday = await this.prisma.reviewLog.count({
          where: {
              user_id: userId,
              review_date: { gte: todayStart, lte: todayEnd },
              countsTowardsGoal: true,
          },
      });
      const goalAchievedToday = completedToday >= dailyGoal;

      // 3. Логика обновления стрика
      let currentStreak = user.currentStreak;
      let maxStreak = user.maxStreak;
      const lastUpdateDate = user.lastStreakUpdate ? new Date(user.lastStreakUpdate) : null;
      const lastUpdateStart = lastUpdateDate ? new Date(lastUpdateDate) : null;
      if(lastUpdateStart) lastUpdateStart.setHours(0,0,0,0);

      let needsDbUpdate = false;

      if (lastUpdateStart && lastUpdateStart.getTime() === todayStart.getTime()) {
        // Обновление уже было сегодня, ничего не делаем
        console.log(`[StatsService] ${prefix} - Streak already updated today.`);
      } else if (lastUpdateStart && lastUpdateStart.getTime() === yesterdayStart.getTime()) {
        // Последнее обновление было вчера
        const goalAchievedYesterday = await this.wasGoalAchieved(userId, yesterdayStart, dailyGoal);
        if (goalAchievedYesterday) {
            // Продолжаем стрик, если вчера была цель
            console.log(`[StatsService] ${prefix} - Goal achieved yesterday. Continuing streak.`);
            currentStreak += 1;
            needsDbUpdate = true;
        } else {
            // Сбрасываем стрик, если вчера не было цели
            console.log(`[StatsService] ${prefix} - Goal NOT achieved yesterday. Resetting streak.`);
            currentStreak = goalAchievedToday ? 1 : 0; // Начинаем новый, если сегодня выполнили
            needsDbUpdate = true;
        }
      } else {
        // Последнее обновление было давно или никогда
        console.log(`[StatsService] ${prefix} - Last update was long ago or never. Resetting streak.`);
        currentStreak = goalAchievedToday ? 1 : 0; // Начинаем новый, если сегодня выполнили
        needsDbUpdate = true;
      }

      // Обновляем максимальный стрик
      if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          needsDbUpdate = true; // Уже должно быть true, но на всякий случай
      }

      // 4. Обновляем данные пользователя в БД, если нужно
      if (needsDbUpdate) {
          console.log(`[StatsService] ${prefix} - Updating user streak in DB: current=${currentStreak}, max=${maxStreak}, lastUpdate=${now.toISOString()}`);
          await this.prisma.user.update({
              where: { id: userId },
              data: {
                  currentStreak: currentStreak,
                  maxStreak: maxStreak,
                  lastStreakUpdate: now,
              },
          });
      }

      // 5. Возвращаем результат
      console.log(`[StatsService] ${prefix} - Returning progress: completed=${completedToday}, currentStreak=${currentStreak}, maxStreak=${maxStreak}`);
      return {
          completedToday: completedToday,
          currentStreak: currentStreak,
          maxStreak: maxStreak,
      };

    } catch (error) {
      console.error(`[StatsService] Error in ${prefix}:`, error);
      // Возвращаем нули в случае ошибки
      return { completedToday: 0, currentStreak: 0, maxStreak: 0 }; 
    }
  }
}
