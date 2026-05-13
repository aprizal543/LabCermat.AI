import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { QcInstrumentsService } from './qc-instruments.service';

@Controller('qc-instruments')
@UseGuards(AuthGuard)
export class QcInstrumentsController {
  constructor(private readonly qcInstrumentsService: QcInstrumentsService) {}

  @Get()
  findAll(@CurrentUser() currentUser: RequestUser) {
    return this.qcInstrumentsService.findAll(currentUser);
  }
}
