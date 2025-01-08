import { Module } from '@nestjs/common';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { StorageProService } from 'src/services/storage-pro.service';
import { GoogleSheetsService } from 'src/services/google-sheets.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService,StorageProService,GoogleSheetsService],
  exports: [NotificationService],
})
export class NotificationModule {}
