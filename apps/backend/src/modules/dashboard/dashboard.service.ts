import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { QcStatus, SamplePriority, SampleStatus } from '@prisma/client';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

// Priority sort order for topPriority: cito first, then urgent, then rutin
const PRIORITY_ORDER: Record<SamplePriority, number> = {
  [SamplePriority.cito]: 0,
  [SamplePriority.urgent]: 1,
  [SamplePriority.rutin]: 2,
};

@Injectable()
export class DashboardService {
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

  async getAnalisDashboard(currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'analis') {
      throw new ForbiddenException(
        'Dashboard analis hanya dapat diakses oleh analis',
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const labId = user.laboratoryId;

    const [totalToday, dalamProses, menungguReview, tervalidasiHariIni, topPriorityCandidates, qcStabilHariIni, qcPerluPerhatianHariIni] =
      await Promise.all([
        // Total sampel yang masuk hari ini di lab ini
        this.prisma.sample.count({
          where: {
            laboratoryId: labId,
            createdAt: { gte: todayStart },
          },
        }),

        // Sampel sedang dalam proses di lab ini
        this.prisma.sample.count({
          where: {
            laboratoryId: labId,
            status: SampleStatus.dalam_proses,
          },
        }),

        // Sampel menunggu review di lab ini
        this.prisma.sample.count({
          where: {
            laboratoryId: labId,
            status: SampleStatus.menunggu_review,
          },
        }),

        // Sampel tervalidasi hari ini (berdasarkan updatedAt)
        this.prisma.sample.count({
          where: {
            laboratoryId: labId,
            status: SampleStatus.tervalidasi,
            updatedAt: { gte: todayStart },
          },
        }),

        // Kandidat top priority: aktif (bukan tervalidasi/dibatalkan), ambil 10 lalu sort + slice 3
        this.prisma.sample.findMany({
          where: {
            laboratoryId: labId,
            status: {
              notIn: [SampleStatus.tervalidasi, SampleStatus.dibatalkan],
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 10,
          select: {
            id: true,
            sampleCode: true,
            sampleType: true,
            requestedTest: true,
            department: true,
            priority: true,
            status: true,
          },
        }),

        // QC hari ini — status stabil
        this.prisma.qcRecord.count({
          where: {
            laboratoryId: labId,
            status: QcStatus.stabil,
            recordedAt: { gte: todayStart },
          },
        }),

        // QC hari ini — status perlu_perhatian
        this.prisma.qcRecord.count({
          where: {
            laboratoryId: labId,
            status: QcStatus.perlu_perhatian,
            recordedAt: { gte: todayStart },
          },
        }),
      ]);

    // Sort by priority (cito > urgent > rutin), then take top 3
    const topPriority = topPriorityCandidates
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
      .slice(0, 3);

    return {
      data: {
        totalToday,
        dalamProses,
        menungguReview,
        tervalidasiHariIni,
        topPriority,
        qcHariIni: {
          stabil: qcStabilHariIni,
          perluPerhatian: qcPerluPerhatianHariIni,
        },
      },
    };
  }

  async getSupervisorDashboard(currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'supervisor') {
      throw new ForbiddenException(
        'Dashboard supervisor hanya dapat diakses oleh supervisor',
      );
    }

    const labId = user.laboratoryId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [menungguReview, tervalidasiHariIni, mintaCekUlang, sampelMenungguReview, qcPerluPerhatian] =
      await Promise.all([
        // Count sampel menunggu review di lab ini
        this.prisma.sample.count({
          where: {
            laboratoryId: labId,
            status: SampleStatus.menunggu_review,
          },
        }),

        // Count sampel tervalidasi hari ini (berdasarkan updatedAt)
        this.prisma.sample.count({
          where: {
            laboratoryId: labId,
            status: SampleStatus.tervalidasi,
            updatedAt: { gte: todayStart },
          },
        }),

        // Count sampel aktif dengan status minta_cek_ulang
        this.prisma.sample.count({
          where: {
            laboratoryId: labId,
            status: SampleStatus.minta_cek_ulang,
          },
        }),

        // List sampel menunggu review — top 5, prioritas tertinggi lalu terlama
        this.prisma.sample.findMany({
          where: {
            laboratoryId: labId,
            status: SampleStatus.menunggu_review,
          },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
          take: 5,
          select: {
            id: true,
            sampleCode: true,
            sampleType: true,
            requestedTest: true,
            department: true,
            priority: true,
            createdAt: true,
            creator: {
              select: { id: true, fullName: true },
            },
          },
        }),

        // Count QC perlu_perhatian — semua record, tidak dibatasi hari ini
        this.prisma.qcRecord.count({
          where: {
            laboratoryId: labId,
            status: QcStatus.perlu_perhatian,
          },
        }),
      ]);

    return {
      data: {
        menungguReview,
        tervalidasiHariIni,
        mintaCekUlang,
        sampelMenungguReview,
        qcPerluPerhatian,
      },
    };
  }
}
