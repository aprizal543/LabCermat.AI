import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';

// Mapping email → nama role. Hanya email yang terdaftar di sini yang diizinkan.
// Sprint lanjutan: admin UI untuk assign role secara dinamis.
const EMAIL_ROLE_MAP: Record<string, string> = {
  'analis@labcermat.demo': 'analis',
  'supervisor@labcermat.demo': 'supervisor',
};

// ID laboratorium default (Lab Klinik Utama, fixed UUID dari seed)
const DEFAULT_LAB_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncUser(
    requestUser: RequestUser,
    fullNameOverride?: string,
  ): Promise<{ user: SyncedUserResult; synced: boolean }> {
    const { supabaseId, email } = requestUser;

    // Validasi: email harus ada di mapping
    const roleName = EMAIL_ROLE_MAP[email];
    if (!roleName) {
      this.logger.warn(`Sync attempted by unmapped email: ${email}`);
      throw new BadRequestException(
        `Email '${email}' tidak terdaftar dalam sistem. ` +
          'Hubungi administrator untuk mendapatkan akses.',
      );
    }

    // Cari role berdasarkan nama
    const role = await this.prisma.role.findFirst({
      where: { name: roleName },
      select: { id: true, name: true, description: true },
    });

    if (!role) {
      this.logger.error(`Role '${roleName}' tidak ditemukan di database`);
      throw new NotFoundException(
        `Konfigurasi role '${roleName}' tidak ditemukan. Hubungi administrator.`,
      );
    }

    // Cari lab default
    const laboratory = await this.prisma.laboratory.findFirst({
      where: { id: DEFAULT_LAB_ID },
      select: { id: true, name: true },
    });

    if (!laboratory) {
      this.logger.error(`Laboratorium default (${DEFAULT_LAB_ID}) tidak ditemukan`);
      throw new NotFoundException(
        'Laboratorium tidak ditemukan. Hubungi administrator.',
      );
    }

    // Tentukan fullName: override dari body, fallback ke bagian sebelum @
    const fullName =
      fullNameOverride?.trim() ||
      this.deriveFullName(email, roleName);

    // Cek apakah user sudah ada
    const existingUser = await this.prisma.user.findUnique({
      where: { authUserId: supabaseId },
      select: { id: true },
    });

    const wasAlreadySynced = existingUser !== null;

    // Upsert — idempotent: aman dipanggil berulang kali
    const user = await this.prisma.user.upsert({
      where: { authUserId: supabaseId },
      create: {
        authUserId: supabaseId,
        email,
        fullName,
        roleId: role.id,
        laboratoryId: laboratory.id,
        status: 'active',
      },
      update: {
        email,
        status: 'active',
        // Tidak update role, fullName, atau laboratoryId saat re-sync
        // agar perubahan yang dilakukan admin tidak tertimpa
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        authUserId: true,
        role: { select: { id: true, name: true, description: true } },
        laboratory: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    // Audit log: hanya tulis saat pertama sync (login pertama)
    if (!wasAlreadySynced) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'user.sync',
          entityType: 'users',
          entityId: user.id,
          metadata: {
            email,
            role: role.name,
            laboratoryId: laboratory.id,
            trigger: 'first_login_sync',
          },
        },
      });

      this.logger.log(
        `User synced for first time: ${email} → role=${role.name}`,
      );
    }

    return {
      user: {
        id: user.id,
        authUserId: user.authUserId,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        role: user.role,
        laboratory: user.laboratory,
        createdAt: user.createdAt,
      },
      synced: !wasAlreadySynced,
    };
  }

  async getMe(supabaseId: string): Promise<MeResult> {
    const user = await this.prisma.user.findUnique({
      where: { authUserId: supabaseId },
      select: {
        id: true,
        authUserId: true,
        email: true,
        fullName: true,
        status: true,
        role: { select: { id: true, name: true, description: true } },
        laboratory: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'User belum tersinkron. Panggil POST /auth/sync-user terlebih dahulu.',
      );
    }

    return user;
  }

  // Derive nama tampilan dari email dan role
  private deriveFullName(email: string, roleName: string): string {
    const roleLabel: Record<string, string> = {
      analis: 'Analis',
      supervisor: 'Supervisor',
      admin: 'Admin',
      auditor: 'Auditor',
    };
    const label = roleLabel[roleName] ?? 'User';
    const localPart = email.split('@')[0] ?? email;
    // "analis" → "Analis Demo"
    return `${label} ${localPart.charAt(0).toUpperCase() + localPart.slice(1)}`;
  }
}

// --- Result types ---

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
}

export interface LaboratorySummary {
  id: string;
  name: string;
}

export interface SyncedUserResult {
  id: string;
  authUserId: string;
  email: string;
  fullName: string;
  status: string;
  role: RoleSummary;
  laboratory: LaboratorySummary;
  createdAt: Date;
}

export interface MeResult extends SyncedUserResult {
  updatedAt: Date;
}
