import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateSampleDto } from './dto/create-sample.dto';
import { GetSamplesQueryDto } from './dto/get-samples-query.dto';
import { UpdateSampleStatusDto } from './dto/update-sample-status.dto';
import { SamplesService } from './samples.service';

@Controller('samples')
@UseGuards(AuthGuard)
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  /** GET /api/v1/samples */
  @Get()
  findAll(
    @Query() query: GetSamplesQueryDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.samplesService.findAll(query, currentUser);
  }

  /** GET /api/v1/samples/:id */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.samplesService.findOne(id, currentUser);
  }

  /** POST /api/v1/samples */
  @Post()
  create(
    @Body() dto: CreateSampleDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.samplesService.create(dto, currentUser);
  }

  /** PATCH /api/v1/samples/:id/status */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSampleStatusDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.samplesService.updateStatus(id, dto, currentUser);
  }
}
