import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleDto } from './dto/module.dto';
import { Module as ModuleEntity, Language, CardStatus, Prisma } from '@prisma/client';
import { LanguageDto } from './dto/language.dto';

export interface ModuleCardStatsCalculated {
  totalCount: number;
  dueTodayCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
}

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureOwner(moduleId: number, userId: number) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { user_id: true },
    });
    if (!mod) throw new NotFoundException(`Модуль ${moduleId} не найден`);
    if (mod.user_id !== userId) throw new ForbiddenException();
  }

  async getAll(userId: number): Promise<(ModuleEntity & { language: Language, cardStats: ModuleCardStatsCalculated })[]> {
    const modules = await this.prisma.module.findMany({
      where: { user_id: userId },
      include: {
        language: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const modulesWithStats = await Promise.all(
      modules.map(async (mod) => {
        const totalCount = await this.prisma.card.count({
          where: { module_id: mod.id },
        });

        const dueCount = await this.prisma.cardSchedule.count({
          where: {
            card: { module_id: mod.id },
            status: CardStatus.review,
            due_date: { lt: tomorrow },
          },
        });

        const statusCounts = await this.prisma.cardSchedule.groupBy({
          by: ['status'],
          where: { card: { module_id: mod.id } },
          _count: {
            status: true,
          },
        });

        const countsByStatus = statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as { [key in CardStatus]?: number });

        const stats: ModuleCardStatsCalculated = {
          totalCount: totalCount,
          dueTodayCount: dueCount,
          newCount: countsByStatus[CardStatus.new] ?? 0,
          learningCount: countsByStatus[CardStatus.learning] ?? 0,
          reviewCount: countsByStatus[CardStatus.review] ?? 0,
          masteredCount: countsByStatus[CardStatus.mastered] ?? 0,
        };

        return {
          ...mod,
          cardStats: stats,
        };
      }),
    );

    return modulesWithStats;
  }

  async getById(id: number, userId: number): Promise<ModuleEntity & { language: Language }> {
    await this.ensureOwner(id, userId);
    return this.prisma.module.findUniqueOrThrow({
      where: { id },
      include: { language: true },
    });
  }

  async create(dto: ModuleDto, userId: number): Promise<ModuleEntity & { language: Language }> {
    if (!dto.title?.trim()) throw new BadRequestException('Название модуля обязательно');
    await this.prisma.language.findUnique({ where: { id: dto.language_id } })
      .then(lang => { if (!lang) throw new NotFoundException(`Язык ${dto.language_id} не найден`); });

    return this.prisma.module.create({
      data: {
        title: dto.title.trim(),
        description: dto.description ?? null,
        language_id: dto.language_id,
        user_id: userId,
      },
      include: { language: true },
    });
  }

  async update(id: number, dto: ModuleDto, userId: number): Promise<ModuleEntity & { language: Language }> {
    await this.ensureOwner(id, userId);
    if (dto.language_id) {
      await this.prisma.language.findUnique({ where: { id: dto.language_id } })
        .then(lang => { if (!lang) throw new NotFoundException(`Язык ${dto.language_id} не найден`); });
    }
    return this.prisma.module.update({
      where: { id },
      data: {
        title: dto.title.trim(),
        description: dto.description ?? null,
        language_id: dto.language_id,
      },
      include: { language: true },
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.ensureOwner(id, userId);
    await this.prisma.$transaction([
      this.prisma.module.delete({ where: { id } }),
    ]);
  }

  async getLanguages(): Promise<LanguageDto[]> {
    const languages = await this.prisma.language.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return languages;
  }
}