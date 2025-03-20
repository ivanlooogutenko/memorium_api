import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { FsrsService } from './fsrs.service';



@Module({
  controllers: [CardsController],
  providers: [CardsService, FsrsService],
})
export class CardsModule {}
