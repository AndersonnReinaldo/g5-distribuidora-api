import { Module } from '@nestjs/common';
import { BotController } from './controllers/bot.controller';
import { BotService } from './services/bot.service';
import { GoogleSheetsService } from 'src/services/google-sheets.service';
import { StorageProService } from 'src/services/storage-pro.service';

@Module({
  controllers: [BotController],
  providers: [BotService,GoogleSheetsService,StorageProService],
  exports: [BotService],
})
export class BotModule {}
