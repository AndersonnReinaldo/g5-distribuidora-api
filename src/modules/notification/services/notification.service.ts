import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from 'src/services/google-sheets.service';
import { randomUUID } from 'crypto'
import { StorageProService } from 'src/services/storage-pro.service';
@Injectable()
export class NotificationService {

  constructor(private readonly googleSheetsService: GoogleSheetsService, private readonly storageProService: StorageProService) {}

  async readNotifications() {
    const data = await this.googleSheetsService.readSpreadsheet('notifications');
  
    const headers = data[0];
    
    const rows = data.slice(1);
  
    const formattedData = rows.map(row => {
      const rowObject = {};
      row.forEach((value, index) => {
        rowObject[headers[index]] = value;
      });
      return rowObject;
    });
  
    return formattedData;
  }
  
  async createNotification(row: { text: string; date: string; status?: string,type:string }): Promise<any> {
    try {
      if (!row || !row.text || !row.date) {
        throw new Error(
          'Dados inválidos fornecidos. Certifique-se de incluir "text" e "date".',
        );
      }
  
      const uuid = randomUUID();
      const rows = [[uuid, row.text, row.date, row?.type, 1]];
  
      await this.googleSheetsService.insertRow(
        'notifications',
        rows,
      );
  
      return {
        uuid, 
        text:row.text,
        date:row.date,
        status:1
      };

    } catch (error) {
      console.error('Erro ao adicionar linha à planilha:', error.message);
      throw new Error('Falha ao adicionar linha à planilha.');
    }
  }

}
