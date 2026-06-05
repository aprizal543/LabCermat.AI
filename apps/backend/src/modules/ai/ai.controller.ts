import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { TriggerSummaryDto } from './dto/trigger-summary.dto';
import { SopQuestionDto } from './dto/sop-question.dto';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** POST /api/v1/ai/prioritize — analis + supervisor */
  @Post('prioritize')
  prioritize(@CurrentUser() currentUser: RequestUser) {
    return this.aiService.prioritize(currentUser);
  }

  /** POST /api/v1/ai/review/:sampleId — analis + supervisor */
  @Post('review/:sampleId')
  reviewResult(
    @Param('sampleId') sampleId: string,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.aiService.reviewResult(sampleId, currentUser);
  }

  /** POST /api/v1/ai/qc-anomaly/:recordId — analis + supervisor */
  @Post('qc-anomaly/:recordId')
  detectQcAnomaly(
    @Param('recordId') recordId: string,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.aiService.detectQcAnomaly(recordId, currentUser);
  }

  /** POST /api/v1/ai/supervisor-summary — supervisor only */
  @Post('supervisor-summary')
  getSupervisorSummary(
    @Body() dto: TriggerSummaryDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.aiService.getSupervisorSummary(dto.shiftHours ?? 8, currentUser);
  }

  /** POST /api/v1/ai/sop-question — analis + supervisor */
  @Post('sop-question')
  askSopQuestion(
    @Body() dto: SopQuestionDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.aiService.askSopQuestion(dto, currentUser);
  }

  /** GET /api/v1/ai/logs/:entityId?type=result_review — analis + supervisor */
  @Get('logs/:entityId')
  getLog(
    @Param('entityId') entityId: string,
    @Query('type') analysisType: string | undefined,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.aiService.getLog(entityId, analysisType, currentUser);
  }
}
