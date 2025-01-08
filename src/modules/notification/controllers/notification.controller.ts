import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('read-notifications')
  async readNotifications() {
    return await this.notificationService.readNotifications();
  }
  
  @Post('create-notification')
  async createNotification(
    @Body() body: { text: string; date: string,status:string, type:string },
  ) {
    const { text, date,status,type } = body;

    return await this.notificationService.createNotification({ text, date, status,type });
  }
}
