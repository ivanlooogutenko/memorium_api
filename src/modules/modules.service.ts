import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleDto } from './dto/module.dto';



@Injectable()
export class ModulesService {

  constructor(private prisma: PrismaService) {}

  private handleError(prefix: string, error: unknown): never {

    const messageError = 
      error instanceof Error ? 
      error.message : String(error);

    throw new Error(`:( ${prefix}: ${messageError}`);

  }



  async getAllModules() {

    try {

      const modules = await this.prisma.module.findMany();

      return modules;

    } catch (error) {

      this.handleError('Не удалось получить список модулей', error);

    }

  }



  async getModuleById(id: string) {

    try {

      const moduleIdNum = parseInt(id, 10);
      
      const module = await this.prisma.module.findUnique({
        where: { id: moduleIdNum },
        include: {
          language: true,
        },
      });

      if (!module) {
        throw new NotFoundException(`Модуль с ID ${id} не найден`);
      }

      return module;

    } catch (error) {

      this.handleError('Не удалось получить модуль', error);

    }

  }



  async getModulesByUser(userId: string) {

    try {

      const userIdNum = parseInt(userId, 10);
      
      const modules = await this.prisma.module.findMany({
        where: { user_id: userIdNum },
        include: {
          language: true,
        },
      });

      return modules;

    } catch (error) {

      this.handleError('Не удалось получить модули пользователя', error);

    }

  }



  async createModule(createModuleDto: ModuleDto) {

    try {

      const createdModule = await this.prisma.module.create({
        data: {
          user_id: parseInt(createModuleDto.user_id, 10),
          language_id: parseInt(createModuleDto.language_id, 10),
          title: createModuleDto.title,
          description: createModuleDto.description,
        },
      });

      return {
        success: true,
        message: 'Модуль успешно создан',
        createdAt: new Date(),
        moduleId: createdModule.id
      };

    } catch (error) {

      this.handleError('Не удалось создать модуль', error);

    }

  }



  async updateModule(id: string, updateModuleDto: ModuleDto) {

    try {

      const moduleIdNum = parseInt(id, 10);
      
      const updatedModule = await this.prisma.module.update({
        where: { id: moduleIdNum },
        data: {
          user_id: parseInt(updateModuleDto.user_id, 10),
          language_id: parseInt(updateModuleDto.language_id, 10),
          title: updateModuleDto.title,
          description: updateModuleDto.description,
        },
      });

      return {
        success: true,
        message: `Модуль с ID ${id} успешно обновлен`,
        updatedAt: new Date(),
        moduleId: updatedModule.id
      };

    } catch (error) {

      this.handleError('Не удалось обновить модуль', error);

    }

  }



  async deleteModule(id: string) {

    try {

      const moduleIdNum = parseInt(id, 10);
      
      const deletedModule = await this.prisma.module.delete({
        where: { id: moduleIdNum },
      });

      return {
        success: true,
        message: `Модуль с ID ${id} успешно удален`,
        deletedAt: new Date(),
        moduleId: deletedModule.id
      };

    } catch (error) {

      this.handleError('Не удалось удалить модуль', error);

    }

  }



  async getModuleStats(id: string) {

    try {

      const moduleIdNum = parseInt(id, 10);
      
      const module = await this.prisma.module.findUnique({
        where: { id: moduleIdNum },
      });

      if (!module) {
        throw new NotFoundException(`Модуль с ID ${id} не найден`);
      }

      const cardsCount = await this.prisma.card.count({
        where: { module_id: moduleIdNum },
      });

      const newCardsCount = await this.prisma.card.count({
        where: { 
          module_id: moduleIdNum,
          schedule: { status: 'new' }
        },
      });

      const learningCardsCount = await this.prisma.card.count({
        where: { 
          module_id: moduleIdNum,
          schedule: { status: 'learning' }
        },
      });

      const reviewCardsCount = await this.prisma.card.count({
        where: { 
          module_id: moduleIdNum,
          schedule: { status: 'review' }
        },
      });

      const masteredCardsCount = await this.prisma.card.count({
        where: { 
          module_id: moduleIdNum,
          schedule: { status: 'mastered' }
        },
      });

      return {
        moduleId: module.id,
        title: module.title,
        totalCards: cardsCount,
        newCards: newCardsCount,
        learningCards: learningCardsCount,
        reviewCards: reviewCardsCount,
        masteredCards: masteredCardsCount
      };

    } catch (error) {

      this.handleError('Не удалось получить статистику модуля', error);

    }

  }

}
