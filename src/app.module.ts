import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrinterService } from './services/printer.service';
import { BotService } from './modules/bot/services/bot.service';
import { StockService } from './modules/stock/services/stock.service';
import { PrismaService } from './modules/prisma/prisma.service';
import { AuthService } from './modules/auth/services/auth.service';
import { ProductService } from './modules/product/services/product.service';
import { CategoryService } from './modules/category/services/category.service';
import { UnitService } from './modules/unit/services/unit.service';
import { PaymentsService } from './modules/payments/services/payments.service';
import { MarkService } from './modules/mark/services/mark.service';
import { CashflowService } from './modules/cashflow/services/cashflow.service';
import { TaskService } from './modules/task/services/task.service';
import { SchedulingService } from './modules/scheduling/services/scheduling.service';
import { NotificationService } from './modules/notification/services/notification.service';
import { BotController } from './modules/bot/controllers/bot.controller';
import { StockController } from './modules/stock/controllers/stock.controller';
import { AuthController } from './modules/auth/controllers/auth.controller';
import { ProductController } from './modules/product/controllers/product.controller';
import { CategoryController } from './modules/category/controllers/category.controller';
import { UnitController } from './modules/unit/controllers/unit.controller';
import { PaymentsController } from './modules/payments/controllers/payments.controller';
import { MarkController } from './modules/mark/controllers/mark.controller';
import { CashflowController } from './modules/cashflow/controllers/cashflow.controller';
import { SchedulingController } from './modules/scheduling/controllers/scheduling.controller';
import { NotificationController } from './modules/notification/controllers/notification.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';
import { GoogleSheetsService } from './services/google-sheets.service';
import { StorageProService } from './services/storage-pro.service';
import { TaskGateway } from './modules/task/gateways/task.gateway';
import { BotGateway } from './modules/bot/gateways/bot.gateway';
import { UsersService } from './modules/users/services/users.service';
import { UsersController } from './modules/users/controllers/users.controller';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MulterModule.register({
      dest: './uploads',
    }),
    ConfigModule.forRoot({
      isGlobal:true
    })
  ],
  controllers:[
    BotController,
    StockController,
    AuthController,
    ProductController,
    CategoryController,
    UnitController,
    PaymentsController,
    MarkController,
    CashflowController,
    SchedulingController,
    NotificationController,
    UsersController
  ],
  providers: [
    PrinterService,
    BotService,
    StockService,
    PrismaService,
    AuthService,
    ProductService,
    CategoryService,
    UnitService,
    PaymentsService,
    MarkService,
    CashflowService,
    TaskService,
    SchedulingService,
    NotificationService,
    GoogleSheetsService,
    SchedulingService,
    StorageProService,
    TaskService,
    TaskGateway,
    BotGateway,
    UsersService,
    JwtService
  ],
})
export class AppModule {}
