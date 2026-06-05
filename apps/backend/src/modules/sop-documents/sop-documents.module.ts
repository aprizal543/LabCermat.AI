import { Module } from '@nestjs/common';
import { SopDocumentsController } from './sop-documents.controller';
import { SopDocumentsService } from './sop-documents.service';

@Module({
  controllers: [SopDocumentsController],
  providers: [SopDocumentsService],
})
export class SopDocumentsModule {}
