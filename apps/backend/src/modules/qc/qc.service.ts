import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, QcStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateQcRecordDto } from './dto/create-qc-record.dto';
import { GetQcRecordsQueryDto } from './dto/get-qc-records-query.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class QcService {
  private readonly logger = new Logger(QcService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  private async resolveUser(currentUser: RequestUser) {
    const user = await this.prisma.user.findUnique({
      where: { authUserId: currentUser.supabaseId },
      include: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan di database');
    }
    return user;
  }

  private calculateStatus(
    controlValue: Prisma.Decimal,
    lowerLimit: Prisma.Decimal,
    upperLimit: Prisma.Decimal,
  ): QcStatus {
    if (controlValue.gte(lowerLimit) && controlValue.lte(upperLimit)) {
      return QcStatus.stabil;
    }
    return QcStatus.perlu_perhatian;
  }

  async create(dto: CreateQcRecordDto, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'analis') {
      throw new ForbiddenException('Hanya analis yang dapat mencatat QC');
    }

    const instrument = await this.prisma.qcInstrument.findUnique({
      where: { id: dto.instrumentId },
      select: { id: true, laboratoryId: true, isActive: true, name: true },
    });

    if (!instrument) {
      throw new NotFoundException('Alat QC tidak ditemukan');
    }

    if (instrument.laboratoryId !== user.laboratoryId) {
      throw new ForbiddenException('Alat QC tidak tersedia untuk laboratorium Anda');
    }

    if (!instrument.isActive) {
      throw new BadRequestException('Alat QC tidak aktif');
    }

    const lowerLimit = new Prisma.Decimal(dto.lowerLimit);
    const upperLimit = new Prisma.Decimal(dto.upperLimit);
    const controlValue = new Prisma.Decimal(dto.controlValue);

    if (lowerLimit.greaterThan(upperLimit)) {
      throw new BadRequestException('lowerLimit tidak boleh lebih besar dari upperLimit');
    }

    const status = this.calculateStatus(controlValue, lowerLimit, upperLimit);
    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const record = await tx.qcRecord.create({
        data: {
          instrumentId: dto.instrumentId,
          laboratoryId: user.laboratoryId,
          controlType: dto.controlType,
          controlValue,
          unit: dto.unit ?? null,
          lowerLimit,
          upperLimit,
          status,
          recordedBy: user.id,
          notes: dto.notes ?? null,
          recordedAt,
        },
        select: {
          id: true,
          instrumentId: true,
          laboratoryId: true,
          controlType: true,
          controlValue: true,
          unit: true,
          lowerLimit: true,
          upperLimit: true,
          status: true,
          notes: true,
          recordedAt: true,
          createdAt: true,
          instrument: { select: { name: true } },
          recorder: { select: { fullName: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'qc.create',
          entityType: 'qc_records',
          entityId: record.id,
          metadata: {
            instrumentId: dto.instrumentId,
            instrumentName: instrument.name,
            controlType: dto.controlType,
            controlValue: dto.controlValue,
            status,
          },
        },
      });

      return record;
    });

    // Fire-and-forget AI anomaly detection — tidak memblokir response
    this.triggerAiAnomaly(result.id, currentUser);

    return { data: result, message: 'Catatan QC berhasil disimpan' };
  }

  private triggerAiAnomaly(recordId: string, currentUser: RequestUser): void {
    this.aiService.detectQcAnomaly(recordId, currentUser).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI QC anomaly trigger gagal | recordId=${recordId} | ${msg}`);
    });
  }

  async findAll(query: GetQcRecordsQueryDto, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'analis' && user.role.name !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke catatan QC');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.QcRecordWhereInput = {
      laboratoryId: user.laboratoryId,
      ...(query.instrumentId ? { instrumentId: query.instrumentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            recordedAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.qcRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { recordedAt: 'desc' },
        select: {
          id: true,
          instrumentId: true,
          controlType: true,
          controlValue: true,
          unit: true,
          lowerLimit: true,
          upperLimit: true,
          status: true,
          notes: true,
          recordedAt: true,
          createdAt: true,
          instrument: { select: { name: true, department: true } },
          recorder: { select: { fullName: true } },
        },
      }),
      this.prisma.qcRecord.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'analis' && user.role.name !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke catatan QC');
    }

    const record = await this.prisma.qcRecord.findUnique({
      where: { id },
      select: {
        id: true,
        instrumentId: true,
        laboratoryId: true,
        controlType: true,
        controlValue: true,
        unit: true,
        lowerLimit: true,
        upperLimit: true,
        status: true,
        notes: true,
        recordedAt: true,
        createdAt: true,
        instrument: { select: { id: true, name: true, department: true } },
        recorder: { select: { id: true, fullName: true } },
      },
    });

    if (!record) {
      throw new NotFoundException('Catatan QC tidak ditemukan');
    }

    if (record.laboratoryId !== user.laboratoryId) {
      throw new ForbiddenException('Catatan QC tidak tersedia untuk laboratorium Anda');
    }

    return { data: record };
  }
}
