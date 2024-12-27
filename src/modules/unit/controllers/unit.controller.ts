import { Controller, Get, Post, Param, Body, Put, UseGuards } from '@nestjs/common';
import { UnitService } from '../services/unit.service';
import { unidades_medida } from '@prisma/client';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('unit')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(): Promise<unidades_medida[]> {
    return this.unitService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number): Promise<unidades_medida> {
    return this.unitService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() stock: Omit<unidades_medida, 'id' | 'createdAt' | 'updatedAt'>): Promise<unidades_medida> {
    return this.unitService.create(stock);
  }
  
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() stock: Partial<unidades_medida>): Promise<unidades_medida> {
    return this.unitService.update(+id, stock);
  }
}
