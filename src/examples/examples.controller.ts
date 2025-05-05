import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamplesService } from './examples.service';
import { ExampleDto } from './dto/example.dto';

@ApiTags('examples')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('examples')
export class ExamplesController {
  constructor(private readonly service: ExamplesService) {}

  @Get('card/:cardId')
  @ApiOperation({ summary: 'Получить примеры карточки' })
  @ApiParam({ name: 'cardId', description: 'ID карточки' })
  getByCard(@Request() req, @Param('cardId', ParseIntPipe) cardId: number) {
    return this.service.getByCard(cardId, req.user.id);
  }

  @Post('card/:cardId')
  @ApiOperation({ summary: 'Создать пример' })
  @ApiParam({ name: 'cardId', description: 'ID карточки' })
  create(
    @Request() req,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() dto: ExampleDto,
  ) {
    return this.service.create(cardId, dto, req.user.id);
  }

  @Put('card/:cardId/:exampleId')
  @ApiOperation({ summary: 'Обновить пример' })
  @ApiParam({ name: 'cardId', description: 'ID карточки' })
  @ApiParam({ name: 'exampleId', description: 'ID примера' })
  update(
    @Request() req,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Param('exampleId', ParseIntPipe) exampleId: number,
    @Body() dto: ExampleDto,
  ) {
    return this.service.update(cardId, exampleId, dto, req.user.id);
  }

  @Delete('card/:cardId/:exampleId')
  @ApiOperation({ summary: 'Удалить пример' })
  @ApiParam({ name: 'cardId', description: 'ID карточки' })
  @ApiParam({ name: 'exampleId', description: 'ID примера' })
  delete(
    @Request() req,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Param('exampleId', ParseIntPipe) exampleId: number,
  ) {
    return this.service.delete(cardId, exampleId, req.user.id);
  }

  @Put('card/:cardId/reorder')
  @ApiOperation({ summary: 'Переупорядочить примеры' })
  @ApiParam({ name: 'cardId', description: 'ID карточки' })
  reorder(
    @Request() req,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() data: { exampleIds: number[] },
  ) {
    return this.service.reorder(cardId, data.exampleIds, req.user.id);
  }
}