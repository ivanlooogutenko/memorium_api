import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardDto } from './dto/card.dto';
import { ReviewDto } from './dto/review.dto';
import { CardStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PredictedStepDto } from './dto/predicted-schedule.dto';

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  
  constructor(private readonly cardsService: CardsService) {}

  @ApiOperation({ summary: 'Получить все карточки' })
  @ApiResponse({ status: 200, description: 'Список всех карточек' })
  @Get()
  getAllCards(@Request() req) {
    return this.cardsService.getAllCards(req.user.id);
  }

  @ApiOperation({ summary: 'Создать новую карточку' })
  @ApiResponse({ status: 201, description: 'Карточка успешно создана' })
  @Post()
  createCard(@Request() req, @Body() createCardDto: CardDto) {
    return this.cardsService.createCard(createCardDto, req.user.id);
  }

  @ApiOperation({ summary: 'Поиск карточек по тексту' })
  @ApiQuery({ name: 'query', description: 'Поисковый запрос', required: true })
  @ApiResponse({ status: 200, description: 'Список найденных карточек' })
  @Get('search')
  searchCards(@Request() req, @Query('query') query: string) {
    return this.cardsService.searchCards(query, req.user.id);
  }

  @ApiOperation({ summary: 'Получить карточки по ID модуля' })
  @ApiParam({ name: 'moduleId', description: 'ID модуля', required: true })
  @ApiResponse({ status: 200, description: 'Список карточек модуля' })
  @Get('module/:moduleId')
  getCardsByModule(
    @Request() req,
    @Param('moduleId', ParseIntPipe) moduleId: number
  ) {
    return this.cardsService.getCardsByModule(moduleId, req.user.id);
  }

  @ApiOperation({ summary: 'Удалить все карточки модуля' })
  @ApiParam({ name: 'moduleId', description: 'ID модуля', required: true })
  @ApiResponse({ status: 200, description: 'Карточки успешно удалены' })
  @Delete('module/:moduleId')
  deleteAllCardsByModule(
    @Request() req,
    @Param('moduleId', ParseIntPipe) moduleId: number
  ) {
    return this.cardsService.deleteAllCardsByModule(moduleId, req.user.id);
  }

  @ApiOperation({ summary: 'Получить карточку по ID' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'Данные карточки' })
  @ApiResponse({ status: 404, description: 'Карточка не найдена' })
  @Get(':id')
  async getCardById(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.cardsService.getCardById(id, req.user.id);
  }

  @ApiOperation({ summary: 'Получить историю и расписание карточки' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'История и текущее расписание карточки' })
  @ApiResponse({ status: 404, description: 'Карточка не найдена' })
  @Get(':id/history')
  async getCardHistory(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    const userId = req.user.id;
    return this.cardsService.getCardHistory(id, userId);
  }

  @ApiOperation({ summary: 'Обновить карточку' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'Карточка успешно обновлена' })
  @ApiResponse({ status: 404, description: 'Карточка не найдена' })
  @Put(':id')
  updateCard(
    @Request() req,
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateCardDto: CardDto
  ) {
    return this.cardsService.updateCard(id, updateCardDto, req.user.id);
  }

  @ApiOperation({ summary: 'Удалить карточку' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'Карточка успешно удалена' })
  @ApiResponse({ status: 404, description: 'Карточка не найдена' })
  @Delete(':id')
  deleteCard(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.cardsService.deleteCard(id, req.user.id);
  }

  @ApiOperation({ summary: 'Загрузить изображение для карточки' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'Изображение успешно загружено' })
  @Post(':id/image')
  uploadImage(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.cardsService.uploadImage(id, req.user.id);
  }

  @ApiOperation({ summary: 'Удалить изображение карточки' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'Изображение успешно удалено' })
  @Delete(':id/image')
  deleteImage(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.cardsService.deleteImage(id, req.user.id);
  }

  @ApiOperation({ summary: 'Получить карточки по статусу' })
  @ApiParam({ name: 'moduleId', description: 'ID модуля', required: true })
  @ApiParam({ name: 'status', description: 'Статус карточки', required: true, enum: CardStatus })
  @ApiQuery({ name: 'date', description: 'Дата для фильтрации (YYYY-MM-DD)', required: false })
  @ApiResponse({ status: 200, description: 'Список карточек с указанным статусом' })
  @Get('module/:moduleId/status/:status')
  getCardsByStatus(
    @Request() req,
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Param('status') status: CardStatus,
    @Query('date') date?: string,
  ) {
    return this.cardsService.getCardsByStatus(moduleId, status, date, req.user.id);
  }

  @ApiOperation({ summary: 'Отправить оценку карточки (повторение)' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'Повторение успешно обработано' })
  @Post(':id/review')
  reviewCard(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewDto: ReviewDto,
  ) {
    return this.cardsService.reviewCard(id, reviewDto, req.user.id);
  }

  @ApiOperation({ summary: 'Сбросить прогресс изучения карточки' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'Прогресс успешно сброшен' })
  @Post(':id/reset')
  resetCardProgress(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.cardsService.resetCardProgress(id, req.user.id);
  }

  @ApiOperation({ summary: 'Получить карточки модуля для повторения (due)' })
  @ApiParam({ name: 'moduleId', description: 'ID модуля', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Список карточек к повторению для данного модуля' })
  @Get('module/:moduleId/due')
  getDueCards(
    @Request() req, 
    @Param('moduleId', ParseIntPipe) moduleId: number
  ) {
    const userId = req.user.id;
    return this.cardsService.getDueCards(userId, moduleId);
  }

  @Get(':id/predict-schedule')
  @ApiOperation({ summary: 'Спрогнозировать расписание карточки (при оценке "good")' })
  @ApiParam({ name: 'id', description: 'ID карточки', type: Number })
  @ApiQuery({ name: 'steps', description: 'Количество шагов прогноза', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Прогноз расписания успешно сгенерирован', type: [PredictedStepDto] })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  @ApiResponse({ status: 404, description: 'Карточка не найдена' })
  predictSchedule(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Query('steps', new ParseIntPipe({ optional: true })) steps?: number
  ) {
    const userId = req.user.id;
    return this.cardsService.predictSchedule(id, userId, steps);
  }
}
