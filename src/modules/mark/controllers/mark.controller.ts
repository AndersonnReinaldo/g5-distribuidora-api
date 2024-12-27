import { Controller, Get, Post, Param, Body, Put, UseGuards } from '@nestjs/common';
import { MarkService } from '../services/mark.service';
import { marca } from '@prisma/client';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('mark')
export class MarkController {
  constructor(private readonly markService: MarkService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(): Promise<marca[]> {
    return this.markService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number): Promise<marca> {
    return this.markService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() stock: Omit<marca, 'id' | 'createdAt' | 'updatedAt'>): Promise<marca> {
    return this.markService.create(stock);
  }
  
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() stock: Partial<marca>): Promise<marca> {
    return this.markService.update(+id, stock);
  }
}
