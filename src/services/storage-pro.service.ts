import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';


@Injectable()
export class StorageProService {
  private baseUrlStorage:string;

  constructor(private configService: ConfigService) {
    //this.baseUrlStorage =  this.configService.get<string>('BASE_URL_STORAGE');
    this.baseUrlStorage = 'http://127.0.0.1:5540/';
  }

  async uploadFile(file: Express.Multer.File, projectName: string): Promise<string> {
    try {
      const form = new FormData();

      form.append('file', fs.createReadStream(file.path), `${file.filename}-${file?.originalname}`);

      const options = {
        method: 'POST',
        url: `http://146.190.168.206:5540/api/save`,
        params: { projectName },
        headers: {
          ...form.getHeaders(),
          'User-Agent': 'axios/1.0.0',
          token: 'test',
        },
        data: form,
      };

      const response = await axios.request(options);

      return response.data[0];
    } catch (error) {
      console.error('Erro ao enviar arquivo para API:', error.message);
      throw new Error('Falha no upload do arquivo.');
    }
  }

  async getFile(fileName:string,projectName:string): Promise<string> {
    try {
      const response = await axios.get(`http://146.190.168.206:5540/api/get?fileName=${fileName}&projectName=${projectName}&projectScope=`);
      return response.data;
    } catch (error) {
      console.error('Erro ao baixar arquivo para API:', error.message);
      throw new Error('Falha ao baixar o arquivo.');
    }
  }

  async deleteFile(fileName:string,projectName:string): Promise<string> {
    try {
      const response = await axios.delete(`http://146.190.168.206:5540/api/delete?fileName=${fileName}&projectName=${projectName}&projectScope=`);
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar arquivo para API:', error.message);
      throw new Error('Falha ao deletar o arquivo.');
    }
  }
}
