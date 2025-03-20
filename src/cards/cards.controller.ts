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

} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardDto } from './dto/card.dto';
import { ReviewDto } from './dto/review.dto';
import { CardStatus } from '@prisma/client';



@Controller('cards')
export class CardsController {

  constructor(private readonly cardsService: CardsService) {}



  @Get()
  getAllCards() {
    return this.cardsService.getAllCards();
  }



  @Post()
  createCard(@Body() createCardDto: CardDto) {
    return this.cardsService.createCard(createCardDto);
  }



  @Get('search')
  searchCards(@Query('query') query: string) {
    return this.cardsService.searchCards(query);
  }



  @Get('module/:moduleId')
  getCardsByModule(@Param('moduleId') moduleId: string) {
    return this.cardsService.getCardsByModule(moduleId);
  }



  @Delete('module/:moduleId')
  deleteAllCardsByModule(@Param('moduleId') moduleId: string) {
    return this.cardsService.deleteAllCardsByModule(moduleId);
  }



  @Get(':id')
  async getCardById(@Param('id') id: string) {
    return this.cardsService.getCardById(id);
  }



  @Put(':id')
  updateCard(
    @Param('id') id: string, 
    @Body() updateCardDto: CardDto
  ) {
    return this.cardsService.updateCard(id, updateCardDto);
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



  @Get('module/:moduleId/status/:status')
  getCardsByStatus(
    @Param('moduleId') moduleId: string,
    @Param('status') status: CardStatus,
    @Query('date') date?: string,
  ) {
    return this.cardsService.getCardsByStatus(moduleId, status, date);
  }



  @Post(':id/review')
  reviewCard(
    @Param('id') id: string,
    @Body() reviewDto: ReviewDto,
  ) {
    return this.cardsService.reviewCard(id, reviewDto);
  }



  @Post(':id/reset')
  resetCardProgress(@Param('id') id: string) {
    return this.cardsService.resetCardProgress(id);
  }
  
}
