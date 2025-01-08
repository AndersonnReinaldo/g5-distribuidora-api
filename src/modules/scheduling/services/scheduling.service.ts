import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from 'src/services/google-sheets.service';
import { randomUUID } from 'crypto'
import { StorageProService } from 'src/services/storage-pro.service';
@Injectable()
export class SchedulingService {

  constructor(private readonly googleSheetsService: GoogleSheetsService, private readonly storageProService: StorageProService) {}

  async readSchedulings() {
    const data = await this.googleSheetsService.readSpreadsheet('mensagens');
  
    const headers = data[0];
    
    const rows = data.slice(1);
  
    const formattedData = rows.map(row => {
      const rowObject = {};
      row.forEach((value, index) => {
        rowObject[headers[index]] = value;
      });
      return rowObject;
    })

    const dataAddColumnKanban = formattedData?.map(row => {
      if(row.sent == 0 && row?.status == 1){
        return {
          ...row,
          column:'pending'
        }
      }else if(row.status == 0){
        return {
          ...row,
          column:'cancel'
        }
      }if(row.sent == 1 && row?.status == 1){
        return {
          ...row,
          column:'sent'
        }
      }
    })
      
    return dataAddColumnKanban;
  }
  
  async createScheduling(row: { imageSent: Express.Multer.File,text: string; date: string; image?: string,caption_image:string; video?: Express.Multer.File, caption_video:string; sent?:string},): Promise<any> {
    try {
      if (!row || !row.date) {
        throw new Error(
          'Dados inválidos fornecidos. Certifique-se de incluir "date".',
        );
      }
  
      const uuid = randomUUID();
      let imageUpload = null;
      let videoUpload = null;

      if (row.imageSent && !row?.image) {
        imageUpload = await this.storageProService.uploadFile(row.imageSent,'images')
      }

      if (row.video) {
        videoUpload = await this.storageProService.uploadFile(row.video,'images')
      }
  
      const image_set = imageUpload?.filePath ? imageUpload?.filePath : 'EMPTY';
      const image_set_caption = row?.caption_image ? row?.caption_image : 'EMPTY';

      const rows = [[uuid, row.text, row?.sent ? 1 : 0, 1, row.date, row.image ? row?.image : image_set, image_set_caption]];

      await this.googleSheetsService.insertRow(
        'mensagens',
        rows,
      );
  
      return {
        message: row?.text,
        image:{
          ...imageUpload,
          caption: row?.caption_image
        }
      };
    } catch (error) {
      console.error('Erro ao adicionar linha à planilha:', error.message);
      throw new Error('Falha ao adicionar linha à planilha.');
    }
  }
  
  async editScheduling(updatedRow: { id: string,  text?: string; date?: string, sent?:number; status?: number, image?:string; image_caption?:string; imageFile?:any   }): Promise<any> {
    try {
      let imageUpload = null;

      if (!updatedRow?.id) {
        throw new Error(
          'Dados inválidos fornecidos. Certifique-se de incluir "id".'
        );
      }
  
      const data = await this.googleSheetsService.readSpreadsheet('mensagens');
      if (updatedRow?.imageFile ) {
        imageUpload = await this.storageProService.uploadFile(updatedRow?.imageFile,'images')
      }
      const headers = data[0];
      console.log(headers);
      const rows = data.slice(1);
      console.log(rows);
  
      const idColumnIndex = headers.indexOf('id');
      if (idColumnIndex === -1) {
        throw new Error('Coluna "id" não encontrada na planilha.');
      }
  
      const rowIndex = rows.findIndex(row => row[idColumnIndex] === updatedRow?.id);
      if (rowIndex === -1) {
        throw new Error(`Linha com id "${updatedRow?.id}" não encontrada.`);
      }
  
      const updatedValues = rows[rowIndex].map((value, index) => {
        console.log(headers[index]);

        if (headers[index] === 'text') {
          return updatedRow.text;
        }
        if (headers[index] === 'date') {
          return updatedRow.date;
        }

        if (headers[index] === 'status') {
          return updatedRow.status;
        }

        if (headers[index] === 'sent') {
          return updatedRow.sent;
        }

        if(headers[index] === 'image'){
          return updatedRow?.image === 'EMPTY' ? 'EMPTY' : imageUpload?.filePath;
        }

        if(headers[index] === 'image_caption'){
          return updatedRow?.image_caption === 'EMPTY' ? 'EMPTY' : updatedRow?.image_caption
        }

        return value;
      });
  
      await this.googleSheetsService.updateRow(
        'mensagens',
        rowIndex + 2,
        updatedValues
      );
  
      return {
        message: 'Linha atualizada com sucesso!',
        updatedRow: updatedValues,
      };
    } catch (error) {
      console.error('Erro ao atualizar linha na planilha:', error);
      throw new Error('Falha ao atualizar linha na planilha.');
    }
  }

  async cancelScheduling(id:string): Promise<any> {
    try {
      if (!id) {
        throw new Error(
          'Dados inválidos fornecidos. Certifique-se de incluir "id".'
        );
      }
  
      const data = await this.googleSheetsService.readSpreadsheet('mensagens');
  
      const headers = data[0];
      const rows = data.slice(1);
  
      const idColumnIndex = headers.indexOf('id');
      if (idColumnIndex === -1) {
        throw new Error('Coluna "id" não encontrada na planilha.');
      }
  
      const rowIndex = rows.findIndex(row => row[idColumnIndex] === id);
      if (rowIndex === -1) {
        throw new Error(`Linha com id "${id}" não encontrada.`);
      }
  
      const updatedValues = rows[rowIndex].map((value, index) => {
        if (headers[index] === 'status') {
          return 0;
        }
        return value;
      });
  
      await this.googleSheetsService.updateRow(
        'mensagens',
        rowIndex + 2,
        updatedValues
      );
  
      return {
        message: 'Agendamento cancelado com sucesso!',
        updatedRow: updatedValues,
      };
    } catch (error) {
      console.error('Erro ao atualizar linha na planilha:', error);
      throw new Error('Falha ao atualizar linha na planilha.');
    }
  }
  
}
