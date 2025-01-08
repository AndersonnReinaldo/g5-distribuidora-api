import { Module } from '@nestjs/common';
import { TaskService } from './services/task.service';
import { SchedulingService } from '../scheduling/services/scheduling.service';
import { BotService } from '../bot/services/bot.service';
import { NotificationService } from '../notification/services/notification.service';
import { TaskGateway } from './gateways/task.gateway';
import { GoogleSheetsService } from 'src/services/google-sheets.service';
import { StorageProService } from 'src/services/storage-pro.service';

@Module({
  controllers: [],
  providers: [TaskService, SchedulingService, NotificationService, TaskGateway, GoogleSheetsService, StorageProService],
  exports: [TaskService]
})
export class TaskModule { }
