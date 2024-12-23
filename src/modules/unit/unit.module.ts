import { Module } from '@nestjs/common';
import { UnitService } from './services/unit.service';
import { UnitController } from './controllers/unit.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UnitController],
  providers: [UnitService],
})
export class UnitModule {}
