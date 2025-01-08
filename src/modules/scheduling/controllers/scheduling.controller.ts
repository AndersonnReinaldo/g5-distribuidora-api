import { Controller, Post, Body, Get, UseInterceptors, UploadedFiles, Put } from '@nestjs/common';
import { SchedulingService } from '../services/scheduling.service';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('read-schedulings')
  async readSchedulings() {
    return await this.schedulingService.readSchedulings();
  }
  
  @Post('update-scheduling')
  @UseInterceptors(FilesInterceptor('files')) 
  async updateScheduling(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: {text: string; date: string; id: string; sent:number; status:number;image:string; image_caption:string; },
  ) {
    const { id, text, date,sent,status,image_caption ,image} = body;

    const imageFile = files.find(file => file.mimetype.startsWith('image/'));
    return await this.schedulingService.editScheduling({id, text, date,sent,status,image,image_caption, imageFile});
  }
  
  @Put('cancel-scheduling')
  async cancelScheduling(
    @Body() body: { id: string; },
  ) {
    const { id } = body;
    return await this.schedulingService.cancelScheduling(id);
  }

  @Post('create-scheduling')
  @UseInterceptors(FilesInterceptor('files')) 
  async createScheduling(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { text: string; date: string,caption_image:string, caption_video:string; sent?:string;image?:string },
  ) {
    const { text, date,caption_image,caption_video,sent,image } = body;

    const imageSent:any = files.find(file => file.mimetype.startsWith('image/'));
    const video = files.find(file => file.mimetype.startsWith('video/'));

    return await this.schedulingService.createScheduling({ text, date, image,caption_image, video, caption_video,sent,imageSent });
  }
}
