import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExampleDto } from './dto/example.dto';



@Injectable()
export class ExamplesService {

  constructor(private prisma: PrismaService) {}
  
  private handleError(prefix: string, error: unknown): never {

    const messageError = 
      error instanceof Error ? 
      error.message : String(error);

    throw new Error(`:( ${prefix}: ${messageError}`);

  }



  async getExamplesByCardId(cardId: string) {

    try {

      const cardIdNum = parseInt(cardId, 10);
      
      const card = await this.prisma.card.findUnique({
        where: { id: cardIdNum },
      });
      
      if (!card) {
        throw new NotFoundException(`Карта с ID ${cardId} отсутствует`);
      }
      
      const examples = await this.prisma.example.findMany({
        where: { card_id: cardIdNum },
        orderBy: { example_order: 'asc' },
      });
      
      return examples;

    } catch (error) {

      this.handleError('Не удалось получить примеры для карты', error);

    }

  }
  


  async createExample(cardId: string, exampleData: ExampleDto) {

    try {

      const cardIdNum = parseInt(cardId, 10);
      
      const card = await this.prisma.card.findUnique({
        where: { id: cardIdNum },
      });
      
      if (!card) {
        throw new NotFoundException(`Карта с ID ${cardId} отсутствует`);
      }

      const maxOrderExample = await this.prisma.example.findFirst({
        where: { card_id: cardIdNum },
        orderBy: { example_order: 'desc' },
      });

      const newOrder = maxOrderExample ? maxOrderExample.example_order + 1 : 1;

      const createdExample = await this.prisma.example.create({
        data: {
          ...exampleData,
          card_id: cardIdNum,
          example_order: exampleData.example_order || newOrder,
        },
      });
      
      return {
        success: true,
        message: `Пример предложения успешно создан`,
        createdAt: new Date(),
        cardId: createdExample.id
      };

    } catch (error) {

      this.handleError('Не удалось создать пример для карты', error);

    }

  }



  async updateExample(cardId: string, exampleId: string, exampleData: ExampleDto) {

    try {

      const cardIdNum = parseInt(cardId, 10);
      const exampleIdNum = parseInt(exampleId, 10);
      
      const card = await this.prisma.card.findUnique({
        where: { id: cardIdNum },
      });
      
      if (!card) {
        throw new NotFoundException(`Карта с ID ${cardId} отсутствует`);
      }

      const example = await this.prisma.example.findUnique({
        where: { id: exampleIdNum },
      });
      
      if (!example || example.card_id !== cardIdNum) {
        throw new NotFoundException(`Пример с ID ${exampleId} отсутствует для карты ${cardId}`);
      }

      const updatedExample = await this.prisma.example.update({
        where: { id: exampleIdNum },
        data: exampleData,
      });
      
      return {
        success: true,
        message: `Пример предложения успешно обновлен`,
        updatedAt: new Date(),
        cardId: updatedExample.id
      };

    } catch (error) {

      this.handleError('Не удалось обновить пример', error);

    }

  }



  async deleteExample(cardId: string, exampleId: string) {

    try {

      const cardIdNum = parseInt(cardId, 10);
      const exampleIdNum = parseInt(exampleId, 10);
      
      const card = await this.prisma.card.findUnique({
        where: { id: cardIdNum },
      });
      
      if (!card) {
        throw new NotFoundException(`Карта с ID ${cardId} отсутствует`);
      }

      const example = await this.prisma.example.findUnique({
        where: { id: exampleIdNum },
      });
      
      if (!example || example.card_id !== cardIdNum) {
        throw new NotFoundException(`Пример с ID ${exampleId} отсутствует для карты ${cardId}`);
      }

      const deletedExample = await this.prisma.example.delete({
        where: { id: exampleIdNum },
      });
      
      return {
        success: true,
        message: `Пример предложения успешно удален`,
        deletedAt: new Date(),
        cardId: deletedExample.id
      };

    } catch (error) {

      this.handleError('Не удалось удалить пример', error);

    }
    
  }

}
