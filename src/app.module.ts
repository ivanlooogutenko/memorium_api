import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CardsModule } from './cards/cards.module';
import { ExamplesModule } from './examples/examples.module';
import { PrismaModule } from './prisma/prisma.module';
import { ModulesModule } from './modules/modules.module';

@Module({
  imports: [CardsModule, ExamplesModule, PrismaModule, ModulesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
