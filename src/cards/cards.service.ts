import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardDto } from './dto/card.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CardsService {

  constructor(private prisma: PrismaService) {}

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

      const cardId = parseInt(id, 10);
      
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
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

      const createdCard = await this.prisma.card.create({
        data: {
          module_id: parseInt(createCardDto.module_id, 10),
          front_text: createCardDto.front_text,
          back_text: createCardDto.back_text,
          image_url: createCardDto.image_url,
          tts_audio_url: createCardDto.tts_audio_url,
        },
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

      const cardId = parseInt(id, 10);
      
      const updatedCard = await this.prisma.card.update({
        where: { id: cardId },
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

      const cardId = parseInt(id, 10);

      const deletedCard = await this.prisma.card.delete({
        where: { id: cardId },
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
    return { message: `Изображение для карты с ID ${id} успешно загружено` };
  }



  deleteImage(id: string) {
    return { message: `Изображение для карты с ID ${id} успешно удалено` };
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

      this.handleError(':( Ошибка при поиске карт', error);

    }

  }
  
}
