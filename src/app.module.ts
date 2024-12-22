import { Module } from '@nestjs/common';
import { StockModule } from './modules/stock/stock.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StockModule, 
    PrismaModule,
    AuthModule
  ],
})
export class AppModule {}
