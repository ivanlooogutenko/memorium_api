import { Module } from '@nestjs/common';
import { ExamplesService } from './examples.service';
import { ExamplesController } from './examples.controller';

@Module({
  providers: [ExamplesService],
  controllers: [ExamplesController]
})
export class ExamplesModule {}
