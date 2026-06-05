import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { SopDocumentsService } from './sop-documents.service';
import { UploadSopDocumentDto } from './dto/upload-sop-document.dto';

@Controller('sop-documents')
@UseGuards(AuthGuard)
export class SopDocumentsController {
  constructor(private readonly sopDocumentsService: SopDocumentsService) {}

  /** POST /api/v1/sop-documents/upload — analis + supervisor */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadSopDocumentDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.sopDocumentsService.upload(file, dto, currentUser);
  }

  /** GET /api/v1/sop-documents — analis + supervisor */
  @Get()
  findAll(@CurrentUser() currentUser: RequestUser) {
    return this.sopDocumentsService.findAll(currentUser);
  }

  /** DELETE /api/v1/sop-documents/:id — analis + supervisor */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.sopDocumentsService.remove(id, currentUser);
  }
}
