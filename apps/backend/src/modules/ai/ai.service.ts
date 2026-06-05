import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { SopQuestionDto, SopQuestionAiResponse } from './dto/sop-question.dto';

// ─── Types for AI service payloads ────────────────────────────────────────

interface SampleItem {
  id: string;
  sample_type: string;
  requested_test: string;
  priority: string;
  received_at: string;
  status: string;
}

interface ResultItem {
  parameter_name: string;
  value: number | string;
  unit: string | null;
  reference_min: number | string | null;
  reference_max: number | string | null;
}

interface QcHistoryItem {
  value: number;
  recorded_at: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiUrl: string;
  // HTTP timeout in ms — AI service is local, 10s is generous
  private readonly timeoutMs = 10_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiUrl = this.config.get<string>('aiServiceUrl') ?? 'http://localhost:8000';
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private async resolveUser(currentUser: RequestUser) {
    const user = await this.prisma.user.findUnique({
      where: { authUserId: currentUser.supabaseId },
      include: { role: true },
    });
    if (!user) throw new UnauthorizedException('User tidak ditemukan di database');
    return user;
  }

  /** Call AI service with a timeout. Throws ServiceUnavailableException on failure. */
  private async callAiService<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.aiUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ServiceUnavailableException(
          `AI service responded with ${res.status}: ${text}`,
        );
      }

      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof ServiceUnavailableException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(`AI service tidak dapat dijangkau: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Save analysis result to ai_analysis_logs. Never throws — failure is logged only. */
  async saveLog(params: {
    laboratoryId: string;
    analysisType: string;
    entityType?: string;
    entityId?: string;
    requestData: unknown;
    responseData: unknown;
    mode: string;
  }): Promise<void> {
    try {
      await this.prisma.aiAnalysisLog.create({
        data: {
          laboratoryId: params.laboratoryId,
          analysisType: params.analysisType,
          entityType: params.entityType ?? null,
          entityId: params.entityId ?? null,
          requestData: params.requestData as object,
          responseData: params.responseData as object,
          mode: params.mode,
        },
      });
    } catch (err) {
      this.logger.error('Failed to save AI analysis log', err);
    }
  }

  // ─── Sample Prioritization ──────────────────────────────────────────────

  async prioritize(currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);
    const roleName = user.role.name;

    if (roleName !== 'analis' && roleName !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke fitur ini');
    }

    // Fetch active (non-terminal) samples in the user's lab
    const samples = await this.prisma.sample.findMany({
      where: {
        laboratoryId: user.laboratoryId,
        status: {
          notIn: ['tervalidasi', 'dibatalkan'],
        },
      },
      select: {
        id: true,
        sampleType: true,
        requestedTest: true,
        priority: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    if (samples.length === 0) {
      return {
        data: { ranked_samples: [], mode: 'rule_based', processed_at: new Date().toISOString() },
        message: 'Tidak ada sampel aktif untuk diprioritaskan',
      };
    }

    const payload = {
      samples: samples.map((s): SampleItem => ({
        id: s.id,
        sample_type: s.sampleType,
        requested_test: s.requestedTest,
        priority: s.priority,
        received_at: s.createdAt.toISOString(),
        status: s.status,
      })),
    };

    const aiResponse = await this.callAiService<Record<string, unknown>>(
      '/ai/v1/sample-prioritization',
      payload,
    );

    await this.saveLog({
      laboratoryId: user.laboratoryId,
      analysisType: 'sample_prioritization',
      entityType: 'laboratory',
      entityId: user.laboratoryId,
      requestData: payload,
      responseData: aiResponse,
      mode: (aiResponse.mode as string) ?? 'rule_based',
    });

    return { data: aiResponse, message: 'Prioritisasi sampel berhasil' };
  }

  // ─── Result Review ──────────────────────────────────────────────────────

  async reviewResult(sampleId: string, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);
    const roleName = user.role.name;

    if (roleName !== 'analis' && roleName !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke fitur ini');
    }

    const sample = await this.prisma.sample.findUnique({
      where: { id: sampleId },
      select: { id: true, laboratoryId: true, sampleCode: true },
    });

    if (!sample) throw new NotFoundException('Sampel tidak ditemukan');
    if (sample.laboratoryId !== user.laboratoryId) {
      throw new ForbiddenException('Sampel tidak tersedia untuk laboratorium Anda');
    }

    const results = await this.prisma.sampleResult.findMany({
      where: { sampleId },
      select: {
        parameterName: true,
        value: true,
        unit: true,
        referenceMin: true,
        referenceMax: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (results.length === 0) {
      throw new NotFoundException('Sampel belum memiliki hasil pemeriksaan yang bisa ditinjau');
    }

    const payload = {
      sample_id: sampleId,
      results: results.map((r): ResultItem => ({
        parameter_name: r.parameterName,
        value: parseFloat(r.value) || r.value,
        unit: r.unit ?? null,
        reference_min: r.referenceMin ? (parseFloat(r.referenceMin) || r.referenceMin) : null,
        reference_max: r.referenceMax ? (parseFloat(r.referenceMax) || r.referenceMax) : null,
      })),
    };

    const aiResponse = await this.callAiService<Record<string, unknown>>(
      '/ai/v1/result-review',
      payload,
    );

    await this.saveLog({
      laboratoryId: user.laboratoryId,
      analysisType: 'result_review',
      entityType: 'sample',
      entityId: sampleId,
      requestData: payload,
      responseData: aiResponse,
      mode: (aiResponse.mode as string) ?? 'rule_based',
    });

    return { data: aiResponse, message: 'Tinjauan AI berhasil' };
  }

  // ─── QC Anomaly ─────────────────────────────────────────────────────────

  async detectQcAnomaly(recordId: string, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);
    const roleName = user.role.name;

    if (roleName !== 'analis' && roleName !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke fitur ini');
    }

    const record = await this.prisma.qcRecord.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        laboratoryId: true,
        instrumentId: true,
        controlType: true,
        controlValue: true,
        unit: true,
        lowerLimit: true,
        upperLimit: true,
        recordedAt: true,
        instrument: { select: { name: true } },
      },
    });

    if (!record) throw new NotFoundException('Catatan QC tidak ditemukan');
    if (record.laboratoryId !== user.laboratoryId) {
      throw new ForbiddenException('Catatan QC tidak tersedia untuk laboratorium Anda');
    }

    // Fetch 7-day history for the same instrument + control type (excluding current record)
    const sevenDaysAgo = new Date(record.recordedAt);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const history = await this.prisma.qcRecord.findMany({
      where: {
        instrumentId: record.instrumentId,
        controlType: record.controlType,
        recordedAt: { gte: sevenDaysAgo, lt: record.recordedAt },
        id: { not: recordId },
      },
      select: { controlValue: true, recordedAt: true },
      orderBy: { recordedAt: 'asc' },
      take: 20,
    });

    const payload = {
      instrument_id: record.instrumentId,
      control_type: record.controlType,
      control_value: parseFloat(record.controlValue.toString()),
      unit: record.unit ?? '',
      lower_limit: parseFloat(record.lowerLimit.toString()),
      upper_limit: parseFloat(record.upperLimit.toString()),
      history: history.map((h): QcHistoryItem => ({
        value: parseFloat(h.controlValue.toString()),
        recorded_at: h.recordedAt.toISOString(),
      })),
    };

    const aiResponse = await this.callAiService<Record<string, unknown>>(
      '/ai/v1/qc-anomaly',
      payload,
    );

    await this.saveLog({
      laboratoryId: user.laboratoryId,
      analysisType: 'qc_anomaly',
      entityType: 'qc_record',
      entityId: recordId,
      requestData: payload,
      responseData: aiResponse,
      mode: (aiResponse.mode as string) ?? 'rule_based',
    });

    return { data: aiResponse, message: 'Analisis QC anomali berhasil' };
  }

  // ─── Supervisor Summary ─────────────────────────────────────────────────

  async getSupervisorSummary(shiftHours: number, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'supervisor') {
      throw new ForbiddenException('Hanya supervisor yang dapat meminta ringkasan shift');
    }

    const shiftEnd = new Date();
    const shiftStart = new Date(shiftEnd.getTime() - shiftHours * 60 * 60 * 1000);
    const labId = user.laboratoryId;

    const [totalSamples, validatedCount, recheckCount, qcIssuesCount, analisList] =
      await Promise.all([
        this.prisma.sample.count({
          where: { laboratoryId: labId, createdAt: { gte: shiftStart } },
        }),
        this.prisma.sample.count({
          where: { laboratoryId: labId, createdAt: { gte: shiftStart }, status: 'tervalidasi' },
        }),
        this.prisma.sample.count({
          where: { laboratoryId: labId, createdAt: { gte: shiftStart }, status: 'minta_cek_ulang' },
        }),
        this.prisma.qcRecord.count({
          where: { laboratoryId: labId, recordedAt: { gte: shiftStart }, status: 'perlu_perhatian' },
        }),
        this.prisma.user.findMany({
          where: { laboratoryId: labId, role: { name: 'analis' } },
          select: { fullName: true },
        }),
      ]);

    const payload = {
      laboratory_id: labId,
      shift_start: shiftStart.toISOString(),
      shift_end: shiftEnd.toISOString(),
      total_samples: totalSamples,
      validated_count: validatedCount,
      recheck_count: recheckCount,
      qc_issues_count: qcIssuesCount,
      analis_list: analisList.map((a) => a.fullName),
    };

    const aiResponse = await this.callAiService<Record<string, unknown>>(
      '/ai/v1/supervisor-summary',
      payload,
    );

    await this.saveLog({
      laboratoryId: labId,
      analysisType: 'supervisor_summary',
      entityType: 'laboratory',
      entityId: labId,
      requestData: payload,
      responseData: aiResponse,
      mode: (aiResponse.mode as string) ?? 'rule_based',
    });

    return { data: aiResponse, message: 'Ringkasan shift berhasil dibuat' };
  }

  // ─── SOP Question ───────────────────────────────────────────────────────

  async askSopQuestion(dto: SopQuestionDto, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'analis' && user.role.name !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke fitur ini');
    }

    const payload = {
      question: dto.question,
      top_k: dto.topK ?? 5,
      ...(dto.documentId ? { document_id: dto.documentId } : {}),
    };

    const aiResponse = await this.callAiService<SopQuestionAiResponse>(
      '/ai/v1/sop-question',
      payload,
    );

    await this.saveLog({
      laboratoryId: user.laboratoryId,
      analysisType: 'sop_question',
      entityType: 'laboratory',
      entityId: user.laboratoryId,
      requestData: payload,
      responseData: aiResponse,
      mode: aiResponse.mode ?? 'template_bm25',
    });

    return { data: aiResponse, message: 'SOP question berhasil dijawab' };
  }

  // ─── AI Log Lookup ──────────────────────────────────────────────────────

  async getLog(entityId: string, analysisType: string | undefined, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'analis' && user.role.name !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke log AI');
    }

    const log = await this.prisma.aiAnalysisLog.findFirst({
      where: {
        entityId,
        laboratoryId: user.laboratoryId,
        ...(analysisType ? { analysisType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        analysisType: true,
        entityType: true,
        entityId: true,
        responseData: true,
        mode: true,
        createdAt: true,
      },
    });

    if (!log) {
      throw new NotFoundException('Log AI tidak ditemukan untuk entitas ini');
    }

    return { data: log };
  }
}
