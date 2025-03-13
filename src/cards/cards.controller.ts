import { Controller, Get, Post, Put, Delete, Param } from '@nestjs/common';

@Controller('cards')
export class CardsController {
  @Get()
  getAllCards() {
    // Placeholder for getting all cards
    return { message: 'List of all cards' };
  }

  @Get(':id')
  getCardById(@Param('id') id: string) {
    // Placeholder for getting a card by ID
    return { message: `Card with ID ${id}` };
  }

  @Post()
  createCard() {
    // Placeholder for creating a card
    return { message: 'Card created successfully' };
  }

  @Put(':id')
  updateCard(@Param('id') id: string) {
    // Placeholder for updating a card
    return { message: `Card with ID ${id} updated successfully` };
  }

  @Delete(':id')
  deleteCard(@Param('id') id: string) {
    // Placeholder for deleting a card
    return { message: `Card with ID ${id} deleted successfully` };
  }

  @Post(':id/image')
  uploadImage(@Param('id') id: string) {
    // Placeholder for uploading an image
    return { message: `Image for card with ID ${id} uploaded successfully` };
  }

  @Delete(':id/image')
  deleteImage(@Param('id') id: string) {
    // Placeholder for deleting an image
    return { message: `Image for card with ID ${id} deleted successfully` };
  }
}
