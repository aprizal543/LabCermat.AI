import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class QcInstrumentsService {
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

  async findAll(currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);

    if (user.role.name !== 'analis' && user.role.name !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke data alat QC');
    }

    const instruments = await this.prisma.qcInstrument.findMany({
      where: {
        laboratoryId: user.laboratoryId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        department: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { data: instruments };
  }
}
