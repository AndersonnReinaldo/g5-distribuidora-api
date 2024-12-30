import { Controller, Get, Post, Param, Body, Put, UseGuards } from '@nestjs/common';
import { CashflowService } from '../services/cashflow.service';
import { caixas_dia } from '@prisma/client';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('cashflow')
export class CashflowController {
  constructor(private readonly cashflowService:CashflowService ) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(): Promise<caixas_dia[]> {
    return this.cashflowService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number): Promise<caixas_dia> {
    return this.cashflowService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() stock: Omit<caixas_dia, 'id' | 'createdAt' | 'updatedAt'>): Promise<caixas_dia> {
    return this.cashflowService.create(stock);
  }
  
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() stock: Partial<caixas_dia>): Promise<caixas_dia> {
    return this.cashflowService.update(+id, stock);
  }

  //Vendas
  @UseGuards(AuthGuard)
  @Post('sale')
  makeSale(@Body() stock: CheckoutAttributes): Promise<any> {
    return this.cashflowService.makeSale(stock);
  }
}
