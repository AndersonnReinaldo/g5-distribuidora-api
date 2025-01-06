import { Controller, Get, Post, Param, Body, Put, UseGuards, Res } from '@nestjs/common';
import { CashflowService } from '../services/cashflow.service';
import { caixas_dia, transacoes } from '@prisma/client';
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
  @Get('generateAllCashSummaries')
  generateAllCashSummaries(): Promise<any[]> {
    return this.cashflowService.generateAllCashSummaries();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number): Promise<caixas_dia> {
    return this.cashflowService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Get('findBoxActiveByUser/:id')
  findBoxActiveByUser(@Param('id') id: number): Promise<caixas_dia> {
    return this.cashflowService.findBoxActiveByUser(+id);
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

  @UseGuards(AuthGuard)
  @Post('openBox/:id')
  openBox(@Param('id') id: number): Promise<any> {
    return this.cashflowService.openBox(+id);
  }

  @UseGuards(AuthGuard)
  @Get('generateDailyCashSummary/:id')
  generateDailyCashSummary(@Param('id') id: number): Promise<any> {
    return this.cashflowService.generateDailyCashSummary(+id);
  }

  @UseGuards(AuthGuard)
  @Put('reverseSale/:id')
  closeBox(@Param('id') id: number): Promise<any> {
    return this.cashflowService.closeBox(+id);
  }

  //Vendas
  @UseGuards(AuthGuard)
  @Post('sale')
  makeSale(@Body() stock: CheckoutAttributes): Promise<any> {
    return this.cashflowService.makeSale(stock);
  }

  @UseGuards(AuthGuard)
  @Post('cancelSale')
  cancelSale(@Body() stock: { id_transacao: number; id_usuario: number }): Promise<any> {
    const { id_transacao,id_usuario } = stock;
    return this.cashflowService.cancelSale(id_transacao,id_usuario);
  }

  @UseGuards(AuthGuard)
  @Get('sale/invoice/pdf/:id')
  async printInvoicePdf(@Param('id') id: number, @Res() res): Promise<any> {
    try {
      const pdfBuffer = await this.cashflowService.printInvoicePdf(+id);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=invoice-${id}.pdf`,
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erro ao gerar o PDF:', error);
      res.status(500).send('Erro ao gerar o PDF.');
    }
  }
  
}
