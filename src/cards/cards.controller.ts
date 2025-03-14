import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { CardsService } from './cards.service';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  getAllCards() {
    return this.cardsService.getAllCards();
  }

  @Get(':id')
  getCardById(@Param('id') id: string) {
    return this.cardsService.getCardById(id);
  }

  @Get('module/:moduleId')
  getCardsByModule(@Param('moduleId') moduleId: string) {
    return this.cardsService.getCardsByModule(moduleId);
  }

  @Post()
  createCard() {
    return this.cardsService.createCard();
  }

  @Put(':id')
  updateCard(@Param('id') id: string) {
    return this.cardsService.updateCard(id);
  }

  @Delete(':id')
  deleteCard(@Param('id') id: string) {
    return this.cardsService.deleteCard(id);
  }

  @Post(':id/image')
  uploadImage(@Param('id') id: string) {
    return this.cardsService.uploadImage(id);
  }

  @Delete(':id/image')
  deleteImage(@Param('id') id: string) {
    return this.cardsService.deleteImage(id);
  }

  @Get('search')
  searchCards(@Query('query') query: string) {
    return this.cardsService.searchCards(query);
  }
}
