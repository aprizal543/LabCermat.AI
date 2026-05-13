import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';

@Injectable()
export class AuditLogsService {
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

  async findAll(query: GetAuditLogsQueryDto, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);
    const roleName = user.role.name;

    if (roleName !== 'analis' && roleName !== 'supervisor' && roleName !== 'auditor' && roleName !== 'admin') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke audit log');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Supervisor, admin, auditor: lihat semua log dalam lab yang sama
    // Analis: hanya log milik diri sendiri
    let userIdFilter: string | undefined;

    if (roleName === 'analis') {
      // Paksa userId ke diri sendiri — abaikan query.userId jika dikirim
      userIdFilter = user.id;
    } else if (roleName === 'supervisor') {
      // Supervisor boleh filter userId, tapi harus dalam lab yang sama
      if (query.userId) {
        const targetUser = await this.prisma.user.findUnique({
          where: { id: query.userId },
          select: { id: true, laboratoryId: true },
        });
        if (!targetUser || targetUser.laboratoryId !== user.laboratoryId) {
          throw new ForbiddenException('User yang diminta tidak berada dalam laboratorium Anda');
        }
        userIdFilter = query.userId;
      }
      // userId tidak diisi → semua user dalam lab (filter lab via subquery di bawah)
    } else {
      // admin / auditor: filter userId langsung jika ada, tanpa lab restriction pada userId
      userIdFilter = query.userId;
    }

    // Untuk supervisor dan bawah, batasi ke user dalam laboratorium yang sama
    // Untuk admin/auditor, kita tidak batasi lab (mereka global) — sesuaikan jika ada kebutuhan multi-lab
    const labUserIds: string[] | undefined =
      roleName === 'analis' || roleName === 'supervisor'
        ? await this.prisma.user
            .findMany({
              where: { laboratoryId: user.laboratoryId },
              select: { id: true },
            })
            .then((rows) => rows.map((r) => r.id))
        : undefined;

    const where: Prisma.AuditLogWhereInput = {
      ...(labUserIds
        ? { userId: { in: labUserIds } }
        : {}),
      ...(userIdFilter ? { userId: userIdFilter } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
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
}
