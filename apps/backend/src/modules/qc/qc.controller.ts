import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { QcService } from './qc.service';
import { CreateQcRecordDto } from './dto/create-qc-record.dto';
import { GetQcRecordsQueryDto } from './dto/get-qc-records-query.dto';

@Controller('qc-records')
@UseGuards(AuthGuard)
export class QcController {
  constructor(private readonly qcService: QcService) {}

  @Post()
  create(
    @Body() dto: CreateQcRecordDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.qcService.create(dto, currentUser);
  }

  @Get()
  findAll(
    @Query() query: GetQcRecordsQueryDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.qcService.findAll(query, currentUser);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.qcService.findOne(id, currentUser);
  }
}
