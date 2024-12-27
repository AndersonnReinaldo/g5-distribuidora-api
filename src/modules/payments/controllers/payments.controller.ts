import { Controller, Get, Post, Param, Body, Put, UseGuards } from '@nestjs/common';
import { PaymentsService } from '../services/payments.service';
import {  metodos_pagamento } from '@prisma/client';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(): Promise<metodos_pagamento[]> {
    return this.paymentsService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number): Promise<metodos_pagamento> {
    return this.paymentsService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() stock: Omit<metodos_pagamento, 'id' | 'createdAt' | 'updatedAt'>): Promise<metodos_pagamento> {
    return this.paymentsService.create(stock);
  }
  
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() stock: Partial<metodos_pagamento>): Promise<metodos_pagamento> {
    return this.paymentsService.update(+id, stock);
  }
}
