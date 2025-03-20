import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardDto } from './dto/card.dto';
import { ReviewDto } from './dto/review.dto';
import { CardStatus, Prisma } from '@prisma/client';
import { FsrsService } from './fsrs.service';



@Injectable()
export class CardsService {

  constructor(
    private prisma: PrismaService,
    private fsrsService: FsrsService,
  ) {}

  private handleError(prefix: string, error: unknown): never {

    const messageError = 
      error instanceof Error ? 
      error.message : String(error);

    throw new Error(`:( ${prefix}: ${messageError}`);

  }



  async getAllCards() {

    try {

      const cards = await this.prisma.card.findMany();

      return cards;

    } catch (error) {

      this.handleError(':( Не удалось получить список карт', error);

    }

  }



  async getCardById(id: string) {

    try {

      const cardIdNum = parseInt(id, 10);

      const card = await this.prisma.card.findUnique({
        where: { id: cardIdNum },
      });

      if (!card) {
        throw new NotFoundException(`Карта с ID ${id} отсутствует`);
      }

      return card;

    } catch (error) {

      this.handleError(':( Не удалось получить карту', error);

    }

  }



  async getCardsByModule(moduleId: string) {

    try {

      const moduleIdNum = parseInt(moduleId, 10);

      const cards = await this.prisma.card.findMany({
        where: { module_id: moduleIdNum },
      });

      return cards;

    } catch (error) {

      this.handleError(':( Не удалось получить карты для модуля', error);

    }

  }



  async createCard(createCardDto: CardDto) {

    try {

      const createdCard = await this.prisma.$transaction(async (prisma) => {
        
        const card = await prisma.card.create({
          data: {
            module_id: parseInt(createCardDto.module_id, 10),
            front_text: createCardDto.front_text,
            back_text: createCardDto.back_text,
            image_url: createCardDto.image_url,
            tts_audio_url: createCardDto.tts_audio_url,
          },
        });

        await prisma.cardSchedule.create({
          data: {
            card_id: card.id,
            status: 'new',           
            difficulty: 0.3,         
            stability: null,         
            review_count: 0,         
            lapses: 0,               
            last_review: null,       
            due_date: null,
            learning_step: 0,          
          },
        });

        return card;

      });

      return {
        success: true,
        message: `Карта успешно создана`,
        createdAt: new Date(),
        cardId: createdCard.id
      };

    } catch (error) {

      this.handleError(':( Не удалось создать карту', error);

    }

  }



  async updateCard(id: string, updateCardDto: CardDto) {

    try {

      const cardIdNum = parseInt(id, 10);

      const updatedCard = await this.prisma.card.update({
        where: { id: cardIdNum },
        data: {
          module_id: parseInt(updateCardDto.module_id, 10),
          front_text: updateCardDto.front_text,
          back_text: updateCardDto.back_text,
          image_url: updateCardDto.image_url,
          tts_audio_url: updateCardDto.tts_audio_url,
        },
      });

      return {
        success: true,
        message: `Карта с ID ${id} успешно обновлена`,
        updatedAt: new Date(),
        cardId: updatedCard.id
      };

    } catch (error) {

      this.handleError(':( Не удалось обновить карту', error);

    }

  }



  async deleteCard(id: string) {

    try {

      const cardIdNum = parseInt(id, 10);

      const deletedCard = await this.prisma.card.delete({
        where: { id: cardIdNum },
      });

      return {
        success: true,
        message: `Карта с ID ${id} успешно удалена`,
        deletedAt: new Date(),
        cardId: deletedCard.id
      };

    } catch (error) {

      this.handleError(':( Не удалось удалить карту', error);

    }

  }



  async deleteAllCardsByModule(moduleId: string) {

    try {

      const moduleIdNum = parseInt(moduleId, 10);

      const result = await this.prisma.card.deleteMany({
        where: { module_id: moduleIdNum },
      });

      return {
        success: true,
        message: `Все карты модуля ${moduleId} удалены.`,
        deletedCount: result.count,
      };

    } catch (error) {

      this.handleError(':( Не удалось удалить все карты модуля', error);

    }

  }



  uploadImage(id: string) {
    return { message: `Изображение для карточки с ID ${id} успешно загружено` };
  }



  deleteImage(id: string) {
    return { message: `Изображение для карточки с ID ${id} успешно удалено` };
  }



  async searchCards(query: string) {

    try {

      const cards = await this.prisma.card.findMany({
        where: {
          OR: [
            { front_text: { contains: query, mode: 'insensitive' } },
            { back_text: { contains: query, mode: 'insensitive' } },
          ],
        },
      });

      return cards;

    } catch (error) {

      this.handleError(':( Ошибка при поиске карточек', error);

    }

  }



  async getCardsByStatus(moduleId: string, status: CardStatus, date?: string) {

    try {

      const moduleIdNum = parseInt(moduleId, 10);

      const dueDate = date ? new Date(date) : new Date();
      
      const sanitizedStatus = status?.toString().trim() as CardStatus;
      
      if (!Object.values(CardStatus).includes(sanitizedStatus)) {
        throw new Error(`:( Такого статуса карточки у нас нет: ${status}`);
      }

      const cards = await this.prisma.card.findMany({
        where: {
          module_id: moduleIdNum,
          schedule: {
            status: sanitizedStatus,
            due_date: sanitizedStatus === 'review' ? { lte: dueDate } : undefined,
          },
        },
        include: {
          schedule: true,
          examples: true,
        },
        orderBy: {
          schedule: { due_date: 'asc' },
        },
      });

      return cards;

    } catch (error) {

      this.handleError(':( Не удалось получить карточки по статусу', error);

    }

  }



  async reviewCard(cardId: string, reviewDto: ReviewDto) {

    try {

      const cardIdNum = parseInt(cardId, 10);

      const card = await this.prisma.card.findUnique({
        where: { id: cardIdNum },
        include: { 
          schedule: true,
          module: true,
        },
      });

      if (!card) {
        throw new NotFoundException(`Карточка с ID ${cardId} не найдена`);
      }

      const updatedSchedule = this.fsrsService.calculateNextReview(
        reviewDto.rating,
        card.schedule?.status || 'new',
        card.schedule?.stability || null,
        card.schedule?.difficulty || 0.3,
        card.schedule?.review_count || 0,
        card.schedule?.lapses || 0,
        card.schedule?.learning_step || 0,
      );

      await this.prisma.cardSchedule.upsert({
        where: { card_id: cardIdNum },
        update: updatedSchedule,
        create: { card_id: cardIdNum, ...updatedSchedule },
      });

      await this.prisma.reviewLog.create({
        data: {
          user_id: card.module.user_id,
          card_id: cardIdNum,
          state: card.schedule?.status || 'new',
          rating: reviewDto.rating,
          next_review_date: updatedSchedule.due_date,
        },
      });

      return {
        success: true,
        message: 'Повторение карточки обработано успешно',
        nextReviewDate: updatedSchedule.due_date,
        status: updatedSchedule.status,
        learningStep: updatedSchedule.learning_step,
      };

    } catch (error) {

      this.handleError(':( Ошибка при сохранении повторения', error);

    }

  }



  async resetCardProgress(cardId: string) {

    try {

      const cardIdNum = parseInt(cardId, 10);

      const card = await this.prisma.card.findUnique({
        where: { id: cardIdNum },
      });

      if (!card) {
        throw new NotFoundException(`Карточка с ID ${cardId} не найдена`);
      }

      await this.prisma.cardSchedule.upsert({
        where: { card_id: cardIdNum },
        update: {
          status: 'new',
          stability: null,
          difficulty: 0.3,
          review_count: 0,
          lapses: 0,
          learning_step: 0,
          last_review: null,
          due_date: null,
        },
        create: {
          card_id: cardIdNum,
          status: 'new',
          difficulty: 0.3,
          review_count: 0,
          lapses: 0,
          learning_step: 0,
        },
      });

      await this.prisma.reviewLog.deleteMany({
        where: { card_id: cardIdNum },
      });

      return {
        success: true,
        message: `Прогресс карточки ${cardId} сброшен`,
        cardId: cardIdNum,
      };

    } catch (error) {

      this.handleError(':( Не удалось сбросить прогресс карточки', error);

    }

  }
  
}
