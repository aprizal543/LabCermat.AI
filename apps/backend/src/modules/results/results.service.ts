import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SampleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateResultDto } from './dto/create-result.dto';

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(sampleId: string, dto: CreateResultDto, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'analis') {
      throw new ForbiddenException('Hanya analis yang dapat menginput hasil pemeriksaan');
    }

    const sample = await this.prisma.sample.findUnique({
      where: { id: sampleId },
      select: { id: true, sampleCode: true, status: true, laboratoryId: true },
    });

    if (!sample) {
      throw new NotFoundException('Sampel tidak ditemukan');
    }

    if (sample.laboratoryId !== user.laboratoryId) {
      throw new ForbiddenException('Sampel tidak tersedia untuk laboratorium Anda');
    }

    if (sample.status !== SampleStatus.dalam_proses) {
      throw new BadRequestException(
        'Hasil hanya dapat diinput pada sampel dengan status dalam_proses',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sampleResult.create({
        data: {
          sampleId,
          parameterName: dto.parameterName,
          value: dto.value,
          unit: dto.unit ?? null,
          referenceMin: dto.referenceMin ?? null,
          referenceMax: dto.referenceMax ?? null,
          note: dto.note ?? null,
          inputBy: user.id,
        },
        select: {
          id: true,
          sampleId: true,
          parameterName: true,
          value: true,
          unit: true,
          referenceMin: true,
          referenceMax: true,
          note: true,
          inputBy: true,
          createdAt: true,
          updatedAt: true,
          inputter: { select: { fullName: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'result.create',
          entityType: 'sample_results',
          entityId: created.id,
          metadata: {
            sampleId,
            sampleCode: sample.sampleCode,
            parameterName: dto.parameterName,
            value: dto.value,
          },
        },
      });

      return created;
    });

    return { data: result, message: 'Hasil pemeriksaan berhasil ditambahkan' };
  }

  async findBySample(sampleId: string, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    const sample = await this.prisma.sample.findUnique({
      where: { id: sampleId },
      select: { id: true, laboratoryId: true },
    });

    if (!sample) {
      throw new NotFoundException('Sampel tidak ditemukan');
    }

    if (sample.laboratoryId !== user.laboratoryId) {
      throw new ForbiddenException('Sampel tidak tersedia untuk laboratorium Anda');
    }

    const results = await this.prisma.sampleResult.findMany({
      where: { sampleId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        sampleId: true,
        parameterName: true,
        value: true,
        unit: true,
        referenceMin: true,
        referenceMax: true,
        note: true,
        inputBy: true,
        createdAt: true,
        updatedAt: true,
        inputter: { select: { fullName: true } },
      },
    });

    return { data: results };
  }
}
