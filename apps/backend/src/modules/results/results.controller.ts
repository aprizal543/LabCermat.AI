import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';

@Controller('samples/:sampleId/results')
@UseGuards(AuthGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post()
  create(
    @Param('sampleId') sampleId: string,
    @Body() dto: CreateResultDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.resultsService.create(sampleId, dto, currentUser);
  }

  @Get()
  findBySample(
    @Param('sampleId') sampleId: string,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.resultsService.findBySample(sampleId, currentUser);
  }
}
