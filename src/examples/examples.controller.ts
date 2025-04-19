import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe
} from '@nestjs/common';
import { ExamplesService } from './examples.service';
import { ExampleDto } from './dto/example.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';



@ApiTags('examples')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('examples')
export class ExamplesController {

  constructor(private readonly examplesService: ExamplesService) {}


  
  @ApiOperation({ summary: 'Получить примеры использования для карточки' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'Список примеров использования' })
  @ApiResponse({ status: 404, description: 'Карточка не найдена' })
  @Get('card/:id')
  getExamplesByCardId(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.examplesService.getExamplesByCardId(id, req.user.id);
  }
  


  @ApiOperation({ summary: 'Создать новый пример использования для карточки' })
  @ApiParam({ name: 'id', description: 'ID карточки', required: true })
  @ApiResponse({ status: 201, description: 'Пример успешно создан' })
  @ApiResponse({ status: 404, description: 'Карточка не найдена' })
  @Post('card/:id')
  createExample(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() exampleData: ExampleDto
  ) {
    return this.examplesService.createExample(id, exampleData, req.user.id);
  }
  


  @ApiOperation({ summary: 'Обновить пример использования' })
  @ApiParam({ name: 'cardId', description: 'ID карточки', required: true })
  @ApiParam({ name: 'exampleId', description: 'ID примера', required: true })
  @ApiResponse({ status: 200, description: 'Пример успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Карточка или пример не найдены' })
  @Put('card/:cardId/:exampleId')
  updateExample(
    @Request() req,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Param('exampleId', ParseIntPipe) exampleId: number,
    @Body() exampleData: ExampleDto
  ) {
    return this.examplesService.updateExample(cardId, exampleId, exampleData, req.user.id);
  }
  


  @ApiOperation({ summary: 'Удалить пример использования' })
  @ApiParam({ name: 'cardId', description: 'ID карточки', required: true })
  @ApiParam({ name: 'exampleId', description: 'ID примера', required: true })
  @ApiResponse({ status: 200, description: 'Пример успешно удален' })
  @ApiResponse({ status: 404, description: 'Карточка или пример не найдены' })
  @Delete('card/:cardId/:exampleId')
  deleteExample(
    @Request() req,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Param('exampleId', ParseIntPipe) exampleId: number
  ) {
    return this.examplesService.deleteExample(cardId, exampleId, req.user.id);
  }
  


  @ApiOperation({ summary: 'Изменить порядок примеров' })
  @ApiParam({ name: 'cardId', description: 'ID карточки', required: true })
  @ApiResponse({ status: 200, description: 'Порядок примеров успешно изменен' })
  @ApiResponse({ status: 404, description: 'Карточка не найдена' })
  @Put('card/:cardId/reorder')
  reorderExamples(
    @Request() req,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() orderData: { exampleIds: number[] }
  ) {
    return this.examplesService.reorderExamples(cardId, orderData.exampleIds, req.user.id);
  }

}
