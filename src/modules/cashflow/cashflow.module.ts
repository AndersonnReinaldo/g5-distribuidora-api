import { Module } from '@nestjs/common';
import { CashflowService } from './services/cashflow.service';
import { CashflowController } from './controllers/cashflow.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StockService } from '../stock/services/stock.service';
import { PrinterService } from 'src/services/printer.service';

@Module({
  imports: [PrismaModule],
  controllers: [CashflowController],
  providers: [CashflowService,StockService,PrinterService],
})
export class CashflowModule {}
