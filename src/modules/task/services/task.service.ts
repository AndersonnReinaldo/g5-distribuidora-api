import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BotService } from 'src/modules/bot/services/bot.service';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { SchedulingService } from 'src/modules/scheduling/services/scheduling.service';
import { TaskGateway } from 'src/modules/task/gateways/task.gateway';

@Injectable()
export class TaskService {
  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly botService: BotService,
    private readonly notificationService: NotificationService,
    private readonly taskGateway: TaskGateway,

  ) {}

  @Cron('*/1 * * * *')
  async sendScheduledMessage() {
    const schedulings = await this.schedulingService.readSchedulings();

    const messagesToSendNow = this.getMessagesToSendNow(schedulings);

    if (messagesToSendNow.length > 0) {
      const message = messagesToSendNow[0];
      let imageStrs = ['', '', ''];

      if (message?.image) {
        imageStrs = message?.image?.split('/');
      }

      const scheduledDate = new Date(message.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const scheduledTime = new Date(message.date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      
      const toastMessage = `Mensagem com agendamento para ${scheduledDate} às ${scheduledTime} enviada com sucesso.`;

      const image = {
        fileName: imageStrs[2] ?? '',
        projectName: imageStrs[1] ?? '',
        caption: message?.image_caption,
      };

      await this.botService.processSpreadsheet(message?.text, image);
      await this.schedulingService.editScheduling({ id: message?.id, sent: 1 });
      await this.notificationService.createNotification({ text:toastMessage,date:`${scheduledDate} às ${scheduledTime}`, type:'scheduled' });

      this.taskGateway.emitMessageUpdate({
        type: 'scheduled',
        messageId: message?.id,
        text: message?.text,
        status: 'sent',
        toastMessage
      });
    }
  }

  private getMessagesToSendNow(messages: any[]): any[] {
    const now = new Date();

    return messages.filter((message) => {
      const messageDate = new Date(message.date);

      const MAX_DELAY = 60000;
      return (
        messageDate.getTime() <= now.getTime() &&
        now.getTime() - messageDate.getTime() <= MAX_DELAY &&
        message.status === '1' &&
        message.sent === '0'
      );
    });
  }
}
