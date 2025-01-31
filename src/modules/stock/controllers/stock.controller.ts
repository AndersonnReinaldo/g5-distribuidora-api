import { Controller, Get, Post, Param, Body, Put, Delete, UseGuards } from '@nestjs/common';
import { StockService } from '../services/stock.service';
import { estoque } from '@prisma/client';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(): Promise<estoque[]> {
    return this.stockService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number): Promise<estoque> {
    return this.stockService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() stock: Omit<estoque, 'id' | 'createdAt' | 'updatedAt'>): Promise<estoque> {
    return this.stockService.create(stock);
  }

  @UseGuards(AuthGuard)
  @Post('movement')
  movement(@Body() stock: Omit<MovementData, 'id' | 'createdAt' | 'updatedAt'>): Promise<estoque> {
    return this.stockService.movement(stock);
  }
  
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() stock: Partial<estoque>): Promise<estoque> {
    return this.stockService.update(+id, stock);
  }

  @UseGuards(AuthGuard)
  @Get('movement/:id')
  findAllMovementsById(@Param('id') id: number): Promise<any> {
    return this.stockService.listAllMovementsById(+id);
  }
}
