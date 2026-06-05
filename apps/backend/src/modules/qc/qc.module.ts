import { Module } from '@nestjs/common';
import { QcService } from './qc.service';
import { QcController } from './qc.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [QcController],
  providers: [QcService],
})
export class QcModule {}
