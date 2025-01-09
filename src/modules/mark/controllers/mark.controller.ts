import { Controller, Get, Post, Param, Body, Put, UseGuards } from '@nestjs/common';
import { MarkService } from '../services/mark.service';
import { marcas } from '@prisma/client';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('mark')
export class MarkController {
  constructor(private readonly markService: MarkService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(): Promise<marcas[]> {
    return this.markService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number): Promise<marcas> {
    return this.markService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() stock: Omit<marcas, 'id' | 'createdAt' | 'updatedAt'>): Promise<marcas> {
    return this.markService.create(stock);
  }
  
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() stock: Partial<marcas>): Promise<marcas> {
    return this.markService.update(+id, stock);
  }
}
