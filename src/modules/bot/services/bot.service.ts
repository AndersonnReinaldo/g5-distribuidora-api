import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { delay } from 'src/common/utils';
import { GoogleSheetsService } from 'src/services/google-sheets.service';
import { Server } from 'ws';
import { StorageProService } from 'src/services/storage-pro.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private client: any;
  private isConnected: boolean;
  private wss: Server;

  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly storageProService: StorageProService,
  ) {}

  async onModuleInit() {

    return;
    console.log('Iniciando Client Whatsapp...');

    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: 'rtech-pdv' }),
      puppeteer: { 
        headless: true,
        args: ['--no-sandbox']
      }
    });

    this.wss = new Server({ port: 3255 });
    console.log('Servidor WebSocket iniciado na porta 3255');

    this.wss.on('connection', (ws) => {

      if(this.isConnected) {
        ws.send(JSON.stringify({ type: 'status', data: 'connected' }));
      }
    });

    this.client.on('qr', async (qr) => {
      console.log('QR Code recebido. Escaneie com o WhatsApp:');

      this.broadcast({ type: 'qr', data: qr });
    });

    this.client.on('ready', () => {
      console.log('Client Whatsapp está pronto! 🚀');
      this.isConnected = true;
      this.broadcast({ type: 'status', data: 'connected' });
    });

    this.client.on('message', (message) => {});

    this.client.on('disconnected', async(reason) => {
      console.log('Client Whatsapp desconectado:', reason);
      this.broadcast({ type: 'status', data: 'disconnected' });
      this.isConnected = false;
    });

    await this.client.initialize();
  }

  async onModuleDestroy() {
    await this.client.destroy();
    console.log('Client Whatsapp desconectado.');
    this.wss.close(() => console.log('Servidor WebSocket fechado.'));
  }

  async processSpreadsheet(
    message: string, 
    image?: { fileName:string,projectName:string,caption:string }, 
  ) {
    const rows = await this.googleSheetsService.readSpreadsheet('contatos');
    
    let mediaImage;
    if(image?.fileName){
      mediaImage = await this.storageProService.getFile(image?.fileName,image?.projectName)
    }

    if (rows.length === 0) {
      return;
    }
  
    const headers = rows[0];
    const results = {
      success: 0,
      failed: 0,
      sentNumbers: [] as string[],
      failedNumbers: [] as string[],
    };
  
  
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const numberIndex = headers.findIndex((header) => header.toLowerCase().includes('telefone'));
      const statusIndex = headers.findIndex((header) => header.toLowerCase().includes('status'));
  
      if (numberIndex === -1 || statusIndex === -1) {
        console.log(`Colunas necessárias não encontradas na planilha (Linha ${i + 1})`);
        continue;
      }
  
      const numero = row[numberIndex];
      const statusEnvio = row[statusIndex];
  
      if (statusEnvio === '1') {
        if (!this.isValidPhoneNumber(numero)) {
          console.log(`Número inválido: ${numero}`);
          results.failed++;
          results.failedNumbers.push(numero);
          continue;
        }
        
        try {
          await delay(1000);
          
          if (message) {
            const personalizedMessage = message.replace('{{number}}', numero);
            await this.client.sendMessage(`55${numero}@c.us`, personalizedMessage);
          }

          if (image?.fileName) {
            var media = new MessageMedia(`image/${image?.fileName?.split('.')?.pop()}`, mediaImage?.data)
            await this.client.sendMessage(`55${numero}@c.us`, media, {caption: image?.caption == 'EMPTY' ? '' : image?.caption} );
          }
  
          results.success++;
          results.sentNumbers.push(numero);
        } catch (error) {
          console.error(`Erro ao enviar mensagem para ${numero}:`, error);
          results.failed++;
          results.failedNumbers.push(numero);
        }
      }
    }

    //await this.storageProService.deleteFile(image?.fileName,image?.projectName)

    return {
      message: 'Mensagens enviadas com sucesso!',
      results
    };
  }
  
  private isValidPhoneNumber(phoneNumber: string): boolean {
    const regex = /^[0-9]{10,11}$/;
    return regex.test(phoneNumber);
  }

  private broadcast(message: any) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    });
  }


  @Cron('0 15 * * 1,3')
  private sendMessageStock() {
    const dayOfWeek = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
    const message = `🚨Aviso Importante: Contagem de Estoque\n\nEquipe, a contagem de estoque será realizada hoje ${dayOfWeek} às 16h.\n\n@558591533953`;
    
    this.client.sendMessage('120363281848568771@g.us', message, {
      mentions: ['558591533953@c.us', ''],
    });
  }
}
