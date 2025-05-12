import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExampleDto } from './dto/example.dto';
import { Example } from '@prisma/client';

@Injectable()
export class ExamplesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureOwner(cardId: number, userId: number) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { module: { select: { user_id: true } } },
    });
    if (!card) throw new NotFoundException(`Карточка ${cardId} не найдена`);
    if (card.module.user_id !== userId) throw new ForbiddenException();
  }

  async getByCard(cardId: number, userId: number) {
    await this.ensureOwner(cardId, userId);
    return this.prisma.example.findMany({
      where: { card_id: cardId },
      orderBy: { example_order: 'asc' },
    });
  }

  async create(cardId: number, dto: ExampleDto, userId: number) {
    await this.ensureOwner(cardId, userId);
    const last = await this.prisma.example.findFirst({
      where: { card_id: cardId },
      orderBy: { example_order: 'desc' },
    });
    const order = dto.example_order ?? ((last?.example_order ?? 0) + 1);
    return this.prisma.example.create({
      data: {
        card_id: cardId,
        example_text: dto.example_text,
        translation_text: dto.translation_text ?? null,
        example_order: order,
      },
    });
  }

  async update(cardId: number, exampleId: number, dto: ExampleDto, userId: number) {
    await this.ensureOwner(cardId, userId);
    const ex = await this.prisma.example.findUnique({ where: { id: exampleId } });
    if (!ex || ex.card_id !== cardId) throw new NotFoundException(`Пример ${exampleId} не найден`);
    return this.prisma.example.update({
      where: { id: exampleId },
      data: {
        example_text: dto.example_text,
        translation_text: dto.translation_text ?? null,
        example_order: dto.example_order ?? ex.example_order,
      },
    });
  }

  async delete(cardId: number, exampleId: number, userId: number) {
    await this.ensureOwner(cardId, userId);
    const ex = await this.prisma.example.findUnique({ where: { id: exampleId } });
    if (!ex || ex.card_id !== cardId) throw new NotFoundException(`Пример ${exampleId} не найден`);
    await this.prisma.example.delete({ where: { id: exampleId } });
    const rem = await this.prisma.example.findMany({ where: { card_id: cardId }, orderBy: { example_order: 'asc' } });
    await this.prisma.$transaction(
      rem.map((item, idx) =>
        this.prisma.example.update({ where: { id: item.id }, data: { example_order: idx + 1 } })
      )
    );
  }

  async reorder(cardId: number, exampleIds: number[], userId: number) {
    await this.ensureOwner(cardId, userId);
    const all = await this.prisma.example.findMany({ where: { card_id: cardId } });
    if (exampleIds.length !== all.length || !exampleIds.every(id => all.some(e => e.id === id))) {
      throw new BadRequestException('Неверный список примеров');
    }
    await this.prisma.$transaction(
      exampleIds.map((id, idx) =>
        this.prisma.example.update({ where: { id }, data: { example_order: idx + 1 } })
      )
    );
  }
}