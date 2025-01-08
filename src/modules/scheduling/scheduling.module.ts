import { Module } from '@nestjs/common';
import { SchedulingController } from './controllers/scheduling.controller';
import { SchedulingService } from './services/scheduling.service';
import { GoogleSheetsService } from 'src/services/google-sheets.service';
import { StorageProService } from 'src/services/storage-pro.service';

@Module({
  controllers: [SchedulingController],
  providers: [SchedulingService,GoogleSheetsService,StorageProService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
