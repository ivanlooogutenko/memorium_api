import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardDto } from './dto/card.dto';
import { ReviewDto } from './dto/review.dto';
import { CardStatus, Prisma, Example, ReviewRating } from '@prisma/client';
import { FsrsService } from './fsrs.service';
import { Rating } from 'ts-fsrs';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fsrs: FsrsService,
  ) {}

  private toFsrsRating(r: number) {
    const map = [null, 'again', 'hard', 'good', 'easy'] as const;
    if (r < 1 || r > 4) {
      throw new BadRequestException(`Неверный рейтинг: ${r}`);
    }
    return FsrsService.mapToFsrsRating(map[r] as 'again' | 'hard' | 'good' | 'easy');
  }

  private toDbRating(r: number) {
    const map = [null, 'again', 'hard', 'good', 'easy'] as const;
    if (r < 1 || r > 4) {
      throw new BadRequestException(`Неверный рейтинг: ${r}`);
    }
    return map[r] as ReviewRating;
  }

  private async ensureOwner(cardId: number, userId: number) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { module: { select: { user_id: true } } },
    });
    if (!card) {
      throw new NotFoundException(`Карточка ${cardId} не найдена`);
    }
    if (card.module.user_id !== userId) {
      throw new ForbiddenException();
    }
  }

  getAll(userId: number) {
    return this.prisma.card.findMany({
      where: { module: { user_id: userId } },
      include: { schedule: true, examples: true },
    });
  }

  getByModule(moduleId: number, userId: number) {
    return this.prisma.card.findMany({
      where: { module_id: moduleId, module: { user_id: userId } },
      include: { schedule: true, examples: true },
    });
  }

  getDue(moduleId: number, userId: number) {
    const now = new Date(); // Get current time for learning cards
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return this.prisma.card.findMany({
      where: {
        module_id: moduleId,
        module: { user_id: userId },
        OR: [
          // New cards
          { schedule: { status: CardStatus.new } },
          // Learning cards due now/today 
          { schedule: { status: CardStatus.learning, due_date: { lte: now } } },
          // Review cards due today or earlier
          { schedule: { status: CardStatus.review, due_date: { lt: tomorrow } } },
        ],
      },
      include: { schedule: true, examples: true },
      // Optional: Order cards (e.g., new first, then by due date)
      orderBy: [
         { schedule: { status: 'asc' } }, // new, learning, review
         { schedule: { due_date: 'asc' } }
      ]
    });
  }

  async search(query: string, userId: number) {
    return this.prisma.card.findMany({
      where: {
        module: { user_id: userId },
        OR: [
          { front_text: { contains: query, mode: 'insensitive' } },
          { back_text: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { schedule: true, examples: true },
    });
  }

  async create(dto: CardDto, userId: number) {
    const moduleId = +dto.module_id;
    const card = await this.prisma.card.create({
      data: {
        module_id: moduleId,
        front_text: dto.front_text,
        back_text: dto.back_text,
        image_url: dto.image_url || null,
        tts_audio_url: dto.tts_audio_url || null,
        examples: dto.examples?.length
          ? { createMany: { data: dto.examples.map((ex, i) => ({
              example_text: ex.example_text,
              translation_text: ex.translation_text || null,
              example_order: i + 1,
            })) } }
          : undefined,
        schedule: { create: this.fsrs.initSchedule() },
      },
      include: { examples: true, schedule: true },
    });
    return card;
  }

  async update(id: number, dto: CardDto, userId: number) {
    await this.ensureOwner(id, userId);
    const moduleId = +dto.module_id;
    const examples = dto.examples?.map((ex, i) => ({
      example_text: ex.example_text,
      translation_text: ex.translation_text || null,
      example_order: i + 1,
    })) || [];

    return this.prisma.$transaction(async tx => {
      const card = await tx.card.update({
        where: { id },
        data: {
          module_id: moduleId,
          front_text: dto.front_text,
          back_text: dto.back_text,
          image_url: dto.image_url,
          tts_audio_url: dto.tts_audio_url,
        },
        include: { schedule: true },
      });
      await tx.example.deleteMany({ where: { card_id: id } });
      if (examples.length) {
        await tx.example.createMany({ data: examples.map(e => ({ card_id: id, ...e })) });
      }
      const updatedExamples = await tx.example.findMany({ where: { card_id: id }, orderBy: { example_order: 'asc' } });
      return { ...card, examples: updatedExamples };
    });
  }

  async delete(id: number, userId: number) {
    await this.ensureOwner(id, userId);
    await this.prisma.$transaction([
      this.prisma.cardSchedule.deleteMany({ where: { card_id: id } }),
      this.prisma.reviewLog.deleteMany({ where: { card_id: id } }),
      this.prisma.card.delete({ where: { id } }),
    ]);
  }

  async deleteAllCardsByModule(moduleId: number, userId: number) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { user_id: true },
    });

    if (!module) {
      throw new NotFoundException(`Модуль ${moduleId} не найден`);
    }
    if (module.user_id !== userId) {
      throw new ForbiddenException(`Вы не владелец модуля ${moduleId}`);
    }

    const cardsToDelete = await this.prisma.card.findMany({
      where: { module_id: moduleId },
      select: { id: true },
    });

    const cardIds = cardsToDelete.map(c => c.id);

    if (cardIds.length === 0) {
      return { deletedCount: 0 };
    }

    await this.prisma.$transaction([
      this.prisma.cardSchedule.deleteMany({ where: { card_id: { in: cardIds } } }),
      this.prisma.reviewLog.deleteMany({ where: { card_id: { in: cardIds } } }),
      this.prisma.example.deleteMany({ where: { card_id: { in: cardIds } } }),
      this.prisma.card.deleteMany({ where: { id: { in: cardIds } } }),
    ]);

    return { deletedCount: cardIds.length };
  }

  async review(id: number, dto: ReviewDto, userId: number) {
    await this.ensureOwner(id, userId);
    const now = new Date();
    const sched = await this.prisma.cardSchedule.upsert({
      where: { card_id: id },
      update: {},
      create: { card_id: id, ...this.fsrs.initSchedule() },
    });

    const fsrsRating = this.toFsrsRating(dto.rating);
    const dbRating   = this.toDbRating(dto.rating);
    const { update, log } = this.fsrs.calculate(sched, fsrsRating, now);

    // Prepare log data
    const logRating = FsrsService.mapFromFsrsRating(fsrsRating);

    // Determine if this review counts towards the daily goal
    const countsTowardsGoal = 
        (fsrsRating === Rating.Good || fsrsRating === Rating.Easy) && // Must be a good/easy answer
        (
            sched.status === CardStatus.review || 
            sched.status === CardStatus.mastered ||
            (sched.status === CardStatus.learning && log.status === CardStatus.review) // Graduated from learning
        );
    console.log(`[FsrsService calculate] Card ID ${sched.card_id}. Counts towards goal: ${countsTowardsGoal}`);

    // Log the review event
    await this.prisma.$transaction([
      this.prisma.cardSchedule.update({ where: { card_id: id }, data: update }),
      this.prisma.reviewLog.create({
        data: {
          card_id: id,
          user_id: userId,
          rating: dbRating, // Use the original DB rating for logging
          state: sched.status, // Log the state *before* the review
          review_date: now,
          countsTowardsGoal: countsTowardsGoal, 
        },
      }),
    ]);

    return this.prisma.card.findUnique({ where: { id }, include: { schedule: true, examples: true } });
  }

  async reset(id: number, userId: number) {
    await this.ensureOwner(id, userId);
    await this.prisma.$transaction([
      this.prisma.cardSchedule.update({ where: { card_id: id }, data: this.fsrs.initSchedule() }),
      this.prisma.reviewLog.deleteMany({ where: { card_id: id } }),
    ]);
    return this.prisma.card.findUnique({ where: { id }, include: { schedule: true, examples: true } });
  }

  async getById(id: number, userId: number) {
    await this.ensureOwner(id, userId);
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: { schedule: true, examples: true },
    });
    if (!card) {
      throw new NotFoundException(`Карточка ${id} не найдена`);
    }
    return card;
  }

  async getByStatus(moduleId: number, status: CardStatus, userId: number, date?: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { user_id: true },
    });
    if (!module) {
      throw new NotFoundException(`Модуль ${moduleId} не найден`);
    }
    if (module.user_id !== userId) {
      throw new ForbiddenException();
    }

    const whereCondition: Prisma.CardWhereInput = {
      module_id: moduleId,
      schedule: { status },
    };

    if (date && (status === CardStatus.learning || status === CardStatus.review)) {
      try {
        const filterDate = new Date(date);
        filterDate.setHours(23, 59, 59, 999);
        if (!whereCondition.schedule) {
          whereCondition.schedule = {};
        }
        whereCondition.schedule.due_date = { lte: filterDate };
      } catch (e) {
        throw new BadRequestException('Неверный формат даты. Используйте YYYY-MM-DD.');
      }
    }

    return this.prisma.card.findMany({
      where: whereCondition,
      include: { schedule: true, examples: true },
      orderBy: { schedule: { due_date: 'asc' } },
    });
  }

  async getHistory(cardId: number, userId: number) {
    await this.ensureOwner(cardId, userId);

    const schedule = await this.prisma.cardSchedule.findUnique({
      where: { card_id: cardId },
    });

    const history = await this.prisma.reviewLog.findMany({
      where: { card_id: cardId },
      orderBy: { review_date: 'asc' },
    });

    return {
      schedule: schedule,
      history: history,
    };
  }
}