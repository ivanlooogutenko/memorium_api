import { Module } from '@nestjs/common';
import { CardsModule } from './cards/cards.module';
import { ExamplesModule } from './examples/examples.module';
import { PrismaModule } from './prisma/prisma.module';
import { ModulesModule } from './modules/modules.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CardsModule, 
    ExamplesModule, 
    PrismaModule, 
    ModulesModule, 
    AuthModule, 
    StatsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
