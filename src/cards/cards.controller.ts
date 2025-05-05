import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseIntPipe, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CardsService } from './cards.service';
import { CardDto } from './dto/card.dto';
import { ReviewDto } from './dto/review.dto';
import { CardStatus } from '@prisma/client';

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private readonly service: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все карточки пользователя' })
  getAll(@Request() req) {
    return this.service.getAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить карточку по ID' })
  @ApiParam({ name: 'id', description: 'ID карточки' })
  getById(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id, req.user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск карточек по тексту' })
  @ApiQuery({ name: 'query', required: true })
  search(@Request() req, @Query('query') q: string) {
    return this.service.search(q, req.user.id);
  }

  @Get('module/:m')
  @ApiOperation({ summary: 'Карточки модуля' })
  @ApiParam({ name: 'm', description: 'ID модуля' })
  getByModule(@Request() req, @Param('m', ParseIntPipe) module: number) {
    return this.service.getByModule(module, req.user.id);
  }

  @Get('module/:m/status/:status')
  @ApiOperation({ summary: 'Получить карточки модуля по статусу' })
  @ApiParam({ name: 'm', description: 'ID модуля' })
  @ApiParam({ name: 'status', description: 'Статус карточки (new, learning, review, mastered)', enum: CardStatus })
  @ApiQuery({ name: 'date', description: 'Фильтр по дате (YYYY-MM-DD), актуально для learning/review (включительно)', required: false })
  getByStatus(
    @Request() req,
    @Param('m', ParseIntPipe) module: number,
    @Param('status') status: string,
    @Query('date') date?: string,
  ) {
    const validStatuses = Object.values(CardStatus);
    if (!validStatuses.includes(status as CardStatus)) {
      throw new BadRequestException(`Неверный статус: ${status}. Допустимые значения: ${validStatuses.join(', ')}`);
    }
    return this.service.getByStatus(module, status as CardStatus, req.user.id, date);
  }

  @Get('module/:m/due')
  @ApiOperation({ summary: 'Карточки к повторению' })
  @ApiParam({ name: 'm', description: 'ID модуля' })
  getDue(@Request() req, @Param('m', ParseIntPipe) module: number) {
    return this.service.getDue(module, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать новую карточку' })
  create(@Request() req, @Body() dto: CardDto) {
    return this.service.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить карточку' })
  @ApiParam({ name: 'id', description: 'ID карточки' })
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CardDto,
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить карточку' })
  @ApiParam({ name: 'id', description: 'ID карточки' })
  delete(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id, req.user.id);
  }

  @Delete('module/:m')
  @ApiOperation({ summary: 'Удалить все карточки модуля' })
  @ApiParam({ name: 'm', description: 'ID модуля' })
  deleteAllCardsByModule(@Request() req, @Param('m', ParseIntPipe) module: number) {
    return this.service.deleteAllCardsByModule(module, req.user.id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Получить историю повторений карточки' })
  @ApiParam({ name: 'id', description: 'ID карточки' })
  getHistory(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.getHistory(id, req.user.id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Оценить карточку' })
  @ApiParam({ name: 'id', description: 'ID карточки' })
  review(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewDto,
  ) {
    return this.service.review(id, dto, req.user.id);
  }

  @Post(':id/reset')
  @ApiOperation({ summary: 'Сбросить прогресс карточки' })
  @ApiParam({ name: 'id', description: 'ID карточки' })
  reset(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.reset(id, req.user.id);
  }
}