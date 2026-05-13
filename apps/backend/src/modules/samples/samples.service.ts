import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, SamplePriority, SampleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateSampleDto } from './dto/create-sample.dto';
import { GetSamplesQueryDto } from './dto/get-samples-query.dto';
import { UpdateSampleStatusDto } from './dto/update-sample-status.dto';

// ─── State machine ──────────────────────────────────────────────

const ANALIS_TRANSITIONS: Partial<Record<SampleStatus, SampleStatus>> = {
  [SampleStatus.menunggu_pemeriksaan]: SampleStatus.dalam_proses,
  [SampleStatus.dalam_proses]: SampleStatus.menunggu_review,
  [SampleStatus.minta_cek_ulang]: SampleStatus.dalam_proses,
};

// Supervisor: transisi eksplisit dari menunggu_review
const SUPERVISOR_TRANSITIONS: Partial<Record<SampleStatus, SampleStatus[]>> = {
  [SampleStatus.menunggu_review]: [
    SampleStatus.tervalidasi,
    SampleStatus.minta_cek_ulang,
  ],
};

// Status terminal — tidak boleh diubah lagi oleh siapapun
const TERMINAL_STATUSES: SampleStatus[] = [
  SampleStatus.tervalidasi,
  SampleStatus.dibatalkan,
];

// Audit action per transisi supervisor
const SUPERVISOR_AUDIT_ACTION: Partial<Record<SampleStatus, string>> = {
  [SampleStatus.tervalidasi]: 'supervisor.validate',
  [SampleStatus.minta_cek_ulang]: 'supervisor.request_recheck',
  [SampleStatus.dibatalkan]: 'supervisor.cancel',
};

@Injectable()
export class SamplesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Private helpers ──────────────────────────────────────────

  /**
   * Resolve supabaseId → internal User row (with role).
   * Used by every mutating method so role.name is always available.
   */
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

  /**
   * Generate sampleCode in format LAB-YYYYMMDD-XXXX.
   * Reads the highest existing code for today and increments — safer than COUNT
   * under concurrent inserts because it reads already-committed rows.
   */
  private async generateSampleCode(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `LAB-${dateStr}-`;

    const latest = await this.prisma.sample.findFirst({
      where: { sampleCode: { startsWith: prefix } },
      orderBy: { sampleCode: 'desc' },
      select: { sampleCode: true },
    });

    const nextSeq = latest
      ? parseInt(latest.sampleCode.slice(prefix.length), 10) + 1
      : 1;

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  // ─── Public methods ───────────────────────────────────────────

  async create(dto: CreateSampleDto, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'analis') {
      throw new ForbiddenException('Hanya analis yang dapat mendaftarkan sampel');
    }

    // Find the laboratory the user belongs to
    const laboratory = await this.prisma.laboratory.findUnique({
      where: { id: user.laboratoryId },
    });
    if (!laboratory) {
      throw new NotFoundException('Laboratorium user tidak ditemukan');
    }

    // Retry loop: generate → insert; on P2002 re-generate and try again (max 5x)
    const MAX_RETRIES = 5;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const sampleCode = await this.generateSampleCode();

      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const sample = await tx.sample.create({
            data: {
              sampleCode,
              laboratoryId: user.laboratoryId,
              sampleType: dto.sampleType,
              requestedTest: dto.requestedTest,
              department: dto.department ?? null,
              priority: dto.priority ?? SamplePriority.rutin,
              status: SampleStatus.menunggu_pemeriksaan,
              receivedAt: new Date(),
              createdBy: user.id,
              notes: dto.notes ?? null,
            },
            select: {
              id: true,
              sampleCode: true,
              sampleType: true,
              requestedTest: true,
              department: true,
              priority: true,
              status: true,
              notes: true,
              receivedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          await tx.sampleStatusLog.create({
            data: {
              sampleId: sample.id,
              previousStatus: null,
              newStatus: SampleStatus.menunggu_pemeriksaan,
              changedBy: user.id,
              note: 'Sampel didaftarkan',
            },
          });

          await tx.auditLog.create({
            data: {
              userId: user.id,
              action: 'sample.create',
              entityType: 'samples',
              entityId: sample.id,
              metadata: {
                sampleCode: sample.sampleCode,
                sampleType: sample.sampleType,
                priority: sample.priority,
              },
            },
          });

          return sample;
        });

        return { data: result, message: 'Sampel berhasil didaftarkan' };
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  async findAll(query: GetSamplesQueryDto, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SampleWhereInput = {
      laboratoryId: user.laboratoryId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.sample.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          sampleCode: true,
          sampleType: true,
          requestedTest: true,
          department: true,
          priority: true,
          status: true,
          notes: true,
          receivedAt: true,
          createdAt: true,
          updatedAt: true,
          creator: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.sample.count({ where }),
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

    const sample = await this.prisma.sample.findUnique({
      where: { id },
      select: {
        id: true,
        sampleCode: true,
        sampleType: true,
        requestedTest: true,
        department: true,
        priority: true,
        status: true,
        notes: true,
        receivedAt: true,
        createdAt: true,
        updatedAt: true,
        laboratory: { select: { id: true, name: true } },
        creator: { select: { id: true, fullName: true } },
        statusLogs: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            previousStatus: true,
            newStatus: true,
            note: true,
            createdAt: true,
            changedByUser: { select: { fullName: true } },
          },
        },
      },
    });

    if (!sample) {
      throw new NotFoundException('Sampel tidak ditemukan');
    }

    // Samples are scoped to the user's laboratory
    if (sample.laboratory.id !== user.laboratoryId) {
      throw new ForbiddenException('Sampel tidak tersedia untuk laboratorium Anda');
    }

    return { data: sample };
  }

  async updateStatus(
    id: string,
    dto: UpdateSampleStatusDto,
    currentUser: RequestUser,
  ) {
    const user = await this.resolveUser(currentUser);
    const roleName = user.role.name;

    // Role check: hanya analis dan supervisor yang boleh mengubah status
    if (roleName !== 'analis' && roleName !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses untuk mengubah status sampel');
    }

    const sample = await this.prisma.sample.findUnique({
      where: { id },
      select: { id: true, sampleCode: true, status: true, laboratoryId: true },
    });

    if (!sample) {
      throw new NotFoundException('Sampel tidak ditemukan');
    }

    if (sample.laboratoryId !== user.laboratoryId) {
      throw new ForbiddenException('Sampel tidak tersedia untuk laboratorium Anda');
    }

    // Status terminal tidak boleh diubah siapapun
    if (TERMINAL_STATUSES.includes(sample.status)) {
      throw new BadRequestException(
        `Status sampel sudah final (${sample.status}) dan tidak dapat diubah lagi`,
      );
    }

    let auditAction: string;

    if (roleName === 'analis') {
      // Analis tidak boleh melakukan transisi supervisor
      if (
        dto.status === SampleStatus.tervalidasi ||
        dto.status === SampleStatus.minta_cek_ulang ||
        dto.status === SampleStatus.dibatalkan
      ) {
        throw new ForbiddenException(
          'Analis tidak dapat melakukan validasi, minta cek ulang, atau pembatalan',
        );
      }

      const allowedNext = ANALIS_TRANSITIONS[sample.status];
      if (allowedNext === undefined || allowedNext !== dto.status) {
        throw new BadRequestException(
          `Transisi status tidak valid: ${sample.status} → ${dto.status}`,
        );
      }

      auditAction = 'sample.status_change';
    } else {
      // Supervisor tidak boleh melakukan transisi analis
      if (
        dto.status === SampleStatus.dalam_proses ||
        dto.status === SampleStatus.menunggu_review
      ) {
        throw new ForbiddenException(
          'Supervisor tidak dapat menjalankan transisi analis',
        );
      }

      // Supervisor: batalkan dari status non-terminal apapun
      if (dto.status === SampleStatus.dibatalkan) {
        if (!dto.note?.trim()) {
          throw new BadRequestException('Alasan pembatalan wajib diisi');
        }
      } else {
        // Supervisor: transisi eksplisit dari menunggu_review
        const allowedNext = SUPERVISOR_TRANSITIONS[sample.status];
        if (!allowedNext || !allowedNext.includes(dto.status)) {
          throw new BadRequestException(
            `Transisi status tidak valid: ${sample.status} → ${dto.status}`,
          );
        }

        if (dto.status === SampleStatus.minta_cek_ulang && !dto.note?.trim()) {
          throw new BadRequestException('Catatan wajib diisi saat meminta cek ulang');
        }
      }

      auditAction = SUPERVISOR_AUDIT_ACTION[dto.status] ?? 'supervisor.status_change';
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.sample.update({
        where: { id },
        data: { status: dto.status },
        select: {
          id: true,
          sampleCode: true,
          status: true,
          updatedAt: true,
        },
      });

      await tx.sampleStatusLog.create({
        data: {
          sampleId: id,
          previousStatus: sample.status,
          newStatus: dto.status,
          changedBy: user.id,
          note: dto.note ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: auditAction,
          entityType: 'samples',
          entityId: id,
          metadata: {
            sampleCode: sample.sampleCode,
            from: sample.status,
            to: dto.status,
            note: dto.note ?? null,
          },
        },
      });

      return updated;
    });

    return { data: result, message: 'Status sampel diperbarui' };
  }
}
