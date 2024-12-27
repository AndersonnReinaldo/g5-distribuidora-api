import { Module } from '@nestjs/common';
import { MarkService } from './services/mark.service';
import { MarkController } from './controllers/mark.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MarkController],
  providers: [MarkService],
})
export class MarkModule {}
