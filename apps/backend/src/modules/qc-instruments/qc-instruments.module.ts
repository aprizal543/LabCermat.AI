import { Module } from '@nestjs/common';
import { QcInstrumentsService } from './qc-instruments.service';
import { QcInstrumentsController } from './qc-instruments.controller';

@Module({
  controllers: [QcInstrumentsController],
  providers: [QcInstrumentsService],
})
export class QcInstrumentsModule {}
