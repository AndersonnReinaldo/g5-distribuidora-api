import { Module } from '@nestjs/common';
import { StockModule } from './modules/stock/stock.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ProductModule } from './modules/product/product.module';
import { CategoryModule } from './modules/category/category.module';
import { UnitModule } from './modules/unit/unit.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StockModule, 
    PrismaModule,
    AuthModule,
    ProductModule,
    CategoryModule,
    UnitModule,
    PaymentsModule
  ],
})
export class AppModule {}
