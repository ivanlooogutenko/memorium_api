import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ExamplesService } from './examples.service';
import { ExampleDto } from './dto/example.dto';



@Controller('examples')
export class ExamplesController {

  constructor(private readonly examplesService: ExamplesService) {}



  @Get('card/:id')
  getExamplesByCardId(@Param('id') id: string) {
    return this.examplesService.getExamplesByCardId(id);
  }
  


  @Post('card/:id')
  createExample(
    @Param('id') id: string,
    @Body() exampleData: ExampleDto
  ) {
    return this.examplesService.createExample(id, exampleData);
  }
  


  @Put('card/:cardId/:exampleId')
  updateExample(
    @Param('cardId') cardId: string,
    @Param('exampleId') exampleId: string,
    @Body() exampleData: ExampleDto
  ) {
    return this.examplesService.updateExample(cardId, exampleId, exampleData);
  }
  


  @Delete('card/:cardId/:exampleId')
  deleteExample(
    @Param('cardId') cardId: string,
    @Param('exampleId') exampleId: string
  ) {
    return this.examplesService.deleteExample(cardId, exampleId);
  }
  
}
