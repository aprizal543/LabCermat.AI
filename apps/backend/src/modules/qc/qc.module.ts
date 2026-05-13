import { Module } from '@nestjs/common';
import { QcService } from './qc.service';
import { QcController } from './qc.controller';

@Module({
  controllers: [QcController],
  providers: [QcService],
})
export class QcModule {}
