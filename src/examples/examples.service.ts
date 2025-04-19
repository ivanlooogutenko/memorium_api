import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExampleDto } from './dto/example.dto';
import { EntityNotFoundException, InvalidOperationException } from '../common/exceptions/business.exceptions';

@Injectable()
export class ExamplesService {

  constructor(private prisma: PrismaService) {}
  
  async getExamplesByCardId(cardId: number, userId: number) {
    try {
      // Проверка существования карточки и прав доступа
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        include: { module: true },
      });
      
      if (!card) {
        throw new EntityNotFoundException('Карточка', cardId);
      }
      
      // Проверка принадлежности карточки пользователю
      if (card.module.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этой карточке');
      }
      
      const examples = await this.prisma.example.findMany({
        where: { card_id: cardId },
        orderBy: { example_order: 'asc' },
      });
      
      return examples;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof EntityNotFoundException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось получить примеры для карточки');
    }
  }
  
  async createExample(cardId: number, exampleData: ExampleDto, userId: number) {
    try {
      // Проверка существования карточки и прав доступа
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        include: { module: true },
      });
      
      if (!card) {
        throw new EntityNotFoundException('Карточка', cardId);
      }
      
      // Проверка принадлежности карточки пользователю
      if (card.module.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этой карточке');
      }

      // Определение порядкового номера для нового примера
      const maxOrderExample = await this.prisma.example.findFirst({
        where: { card_id: cardId },
        orderBy: { example_order: 'desc' },
      });

      const newOrder = maxOrderExample ? maxOrderExample.example_order + 1 : 1;

      const createdExample = await this.prisma.example.create({
        data: {
          example_text: exampleData.example_text,
          translation_text: exampleData.translation_text,
          tts_audio_url: exampleData.tts_audio_url,
          card_id: cardId,
          example_order: exampleData.example_order || newOrder,
        },
      });
      
      return {
        success: true,
        message: 'Пример предложения успешно создан',
        createdAt: new Date(),
        example: createdExample
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof EntityNotFoundException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось создать пример для карточки');
    }
  }

  async updateExample(cardId: number, exampleId: number, exampleData: ExampleDto, userId: number) {
    try {
      // Проверка существования карточки и прав доступа
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        include: { module: true },
      });
      
      if (!card) {
        throw new EntityNotFoundException('Карточка', cardId);
      }
      
      // Проверка принадлежности карточки пользователю
      if (card.module.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этой карточке');
      }

      // Проверка существования примера
      const example = await this.prisma.example.findUnique({
        where: { id: exampleId },
      });

      if (!example) {
        throw new EntityNotFoundException('Пример', exampleId);
      }

      if (example.card_id !== cardId) {
        throw new InvalidOperationException('Пример не принадлежит указанной карточке');
      }

      const updatedExample = await this.prisma.example.update({
        where: { id: exampleId },
        data: {
          example_text: exampleData.example_text,
          translation_text: exampleData.translation_text,
          tts_audio_url: exampleData.tts_audio_url,
          example_order: exampleData.example_order,
        },
      });

      return {
        success: true,
        message: 'Пример успешно обновлен',
        updatedAt: new Date(),
        example: updatedExample
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof EntityNotFoundException || error instanceof InvalidOperationException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось обновить пример');
    }
  }

  async deleteExample(cardId: number, exampleId: number, userId: number) {
    try {
      // Проверка существования карточки и прав доступа
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        include: { module: true },
      });
      
      if (!card) {
        throw new EntityNotFoundException('Карточка', cardId);
      }
      
      // Проверка принадлежности карточки пользователю
      if (card.module.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этой карточке');
      }

      // Проверка существования примера
      const example = await this.prisma.example.findUnique({
        where: { id: exampleId },
      });

      if (!example) {
        throw new EntityNotFoundException('Пример', exampleId);
      }

      if (example.card_id !== cardId) {
        throw new InvalidOperationException('Пример не принадлежит указанной карточке');
      }

      await this.prisma.example.delete({
        where: { id: exampleId },
      });

      // Переупорядочиваем оставшиеся примеры
      const remainingExamples = await this.prisma.example.findMany({
        where: { card_id: cardId },
        orderBy: { example_order: 'asc' },
      });

      // Обновляем порядок оставшихся примеров
      for (let i = 0; i < remainingExamples.length; i++) {
        await this.prisma.example.update({
          where: { id: remainingExamples[i].id },
          data: { example_order: i + 1 },
        });
      }

      return {
        success: true,
        message: 'Пример успешно удален',
        deletedAt: new Date()
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof EntityNotFoundException || error instanceof InvalidOperationException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось удалить пример');
    }
  }

  async reorderExamples(cardId: number, exampleIds: number[], userId: number) {
    try {
      // Проверка существования карточки и прав доступа
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        include: { module: true },
      });
      
      if (!card) {
        throw new EntityNotFoundException('Карточка', cardId);
      }
      
      // Проверка принадлежности карточки пользователю
      if (card.module.user_id !== userId) {
        throw new ForbiddenException('У вас нет доступа к этой карточке');
      }

      // Получаем все примеры карточки
      const examples = await this.prisma.example.findMany({
        where: { card_id: cardId },
      });

      // Проверяем, что все переданные ID принадлежат примерам этой карточки
      const exampleSet = new Set(examples.map(e => e.id));
      const allExamplesExist = exampleIds.every(id => exampleSet.has(id));

      if (!allExamplesExist) {
        throw new InvalidOperationException('Некоторые примеры не принадлежат указанной карточке');
      }

      // Проверяем, что количество переданных ID соответствует количеству примеров
      if (exampleIds.length !== examples.length) {
        throw new InvalidOperationException('Количество примеров не соответствует ожидаемому');
      }

      // Обновляем порядок примеров в транзакции
      await this.prisma.$transaction(
        exampleIds.map((id, index) => 
          this.prisma.example.update({
            where: { id },
            data: { example_order: index + 1 },
          })
        )
      );

      return {
        success: true,
        message: 'Порядок примеров успешно обновлен',
        updatedAt: new Date()
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof EntityNotFoundException || error instanceof InvalidOperationException) {
        throw error;
      }
      throw new InvalidOperationException('Не удалось изменить порядок примеров');
    }
  }
}
