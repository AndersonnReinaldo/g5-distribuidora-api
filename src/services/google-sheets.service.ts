import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class GoogleSheetsService {
  private sheets;
  private spreadsheetId:string;

  constructor(private configService: ConfigService) {
    const auth = new google.auth.GoogleAuth({
      keyFile: '/var/www/sushi-park-api/sushi-park-sheets-api.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId =  this.configService.get<string>('SPREADSHEET_ID');
  }

  /**
   * Lê todos os dados da planilha especificada.
   * @param spreadsheetId ID da planilha do Google Sheets
   * @param sheetName Nome da aba na planilha
   * @returns Dados da planilha
   */
  async readSpreadsheet(sheetName: string) {
    const range = `${sheetName}!A:Z`;
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('Nenhum dado encontrado na planilha.');
      return [];
    }

    return rows;
  }

  /**
   * Insere uma nova linha na planilha especificada.
   * @param spreadsheetId ID da planilha do Google Sheets
   * @param sheetName Nome da aba na planilha
   * @param values Dados a serem inseridos (como um array)
   * @returns Resposta da API após a inserção
   */
  async insertRow(sheetName: string, values: any[]) {
    const range = `${sheetName}!A1`;
    const resource = {
      values
    };

    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource,
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao inserir linha:', error);
      throw new Error('Não foi possível inserir a linha');
    }
  }

  async updateRow(sheetName: string, rowIndex: number, values: string[]): Promise<any> {
    const request = {
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    };
    return await this.sheets.spreadsheets.values.update(request);
  }
  
}
