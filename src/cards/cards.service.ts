import { Injectable } from '@nestjs/common';

@Injectable()
export class CardsService {
  getAllCards() {
    return { message: 'List of all cards' };
  }

  getCardById(id: string) {
    return { message: `Card with ID ${id}` };
  }

  getCardsByModule(moduleId: string) {
    return { message: `List of cards for module with ID ${moduleId}` };
  }

  createCard() {
    return { message: 'Card created successfully' };
  }

  updateCard(id: string) {
    return { message: `Card with ID ${id} updated successfully` };
  }

  deleteCard(id: string) {
    return { message: `Card with ID ${id} deleted successfully` };
  }

  uploadImage(id: string) {
    return { message: `Image for card with ID ${id} uploaded successfully` };
  }

  deleteImage(id: string) {
    return { message: `Image for card with ID ${id} deleted successfully` };
  }
}
