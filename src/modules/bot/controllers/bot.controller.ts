import { Controller, Post, Body } from '@nestjs/common';
import { BotService } from '../services/bot.service';

interface IFile { fileName:string,projectName:string,caption:string }
@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('process-spreadsheet')
  async processSpreadsheet(
    @Body() body: { message: string,image?:IFile,video?:IFile },
  ) {
    const { message,image,video } = body;
    return await this.botService.processSpreadsheet(message,image);
  }
}
