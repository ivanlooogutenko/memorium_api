import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModuleDto } from './dto/module.dto';



@Controller('modules')
export class ModulesController {

  constructor(private readonly modulesService: ModulesService) {}



  @Get()
  getAllModules() {
    return this.modulesService.getAllModules();
  }



  @Get('user/:userId')
  getModulesByUser(@Param('userId') userId: string) {
    return this.modulesService.getModulesByUser(userId);
  }



  @Get(':id')
  getModuleById(@Param('id') id: string) {
    return this.modulesService.getModuleById(id);
  }



  @Get(':id/stats')
  getModuleStats(@Param('id') id: string) {
    return this.modulesService.getModuleStats(id);
  }



  @Post()
  createModule(@Body() createModuleDto: ModuleDto) {
    return this.modulesService.createModule(createModuleDto);
  }



  @Put(':id')
  updateModule(
    @Param('id') id: string,
    @Body() updateModuleDto: ModuleDto
  ) {
    return this.modulesService.updateModule(id, updateModuleDto);
  }



  @Delete(':id')
  deleteModule(@Param('id') id: string) {
    return this.modulesService.deleteModule(id);
  }

}
