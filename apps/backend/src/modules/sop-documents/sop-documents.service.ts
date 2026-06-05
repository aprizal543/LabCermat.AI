import {
  BadRequestException,
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
import { UploadSopDocumentDto } from './dto/upload-sop-document.dto';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME   = 'application/pdf';

interface AiParseIndexResponse {
  document_id: string;
  title: string;
  status: string;
  chunk_count: number;
  pages_count: number;
  tables_count: number;
  indexed_count: number;
}

@Injectable()
export class SopDocumentsService {
  private readonly logger = new Logger(SopDocumentsService.name);
  private readonly aiUrl: string;
  private readonly timeoutMs = 60_000; // parsing can take longer than normal AI calls

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

  private guardRole(roleName: string) {
    if (roleName !== 'analis' && roleName !== 'supervisor') {
      throw new ForbiddenException('Role Anda tidak memiliki akses ke fitur ini');
    }
  }

  // ─── Upload & parse-index ────────────────────────────────────────────────

  async upload(
    file: Express.Multer.File,
    dto: UploadSopDocumentDto,
    currentUser: RequestUser,
  ) {
    const user = await this.resolveUser(currentUser);
    this.guardRole(user.role.name);

    // Validate file
    if (!file) throw new BadRequestException('File PDF wajib diunggah');
    if (file.mimetype !== ALLOWED_MIME) {
      throw new BadRequestException('Hanya file PDF yang diizinkan');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('Ukuran file maksimal 5 MB');
    }

    const title = dto.title?.trim() || file.originalname.replace(/\.pdf$/i, '');

    // Create pending record
    const doc = await this.prisma.sopDocument.create({
      data: {
        laboratoryId:     user.laboratoryId,
        title,
        originalFilename: file.originalname,
        mimeType:         file.mimetype,
        sizeBytes:        file.size,
        status:           'pending',
        uploadedById:     user.id,
      },
    });

    // Forward to AI Service for parse + index
    try {
      const formData = new FormData();
      formData.append('document_id', doc.id);
      formData.append('title', title);
      formData.append(
        'file',
        new Blob([file.buffer], { type: file.mimetype }),
        file.originalname,
      );

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      let aiRes: Response;
      try {
        aiRes = await fetch(`${this.aiUrl}/ai/v1/sop-documents/parse-index`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!aiRes.ok) {
        const text = await aiRes.text().catch(() => '');
        throw new Error(`AI service ${aiRes.status}: ${text}`);
      }

      const parsed = (await aiRes.json()) as AiParseIndexResponse;

      // Update to indexed
      const updated = await this.prisma.sopDocument.update({
        where: { id: doc.id },
        data: {
          status:     'indexed',
          chunkCount: parsed.chunk_count,
          indexedAt:  new Date(),
        },
        include: { uploadedBy: { select: { fullName: true } } },
      });

      this.logger.log(
        `SopDocument ${doc.id} indexed: ${parsed.chunk_count} chunks, ${parsed.pages_count} pages`,
      );

      return { data: updated, message: 'Dokumen SOP berhasil diparse dan diindeks' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`SopDocument ${doc.id} parse failed: ${msg}`);

      await this.prisma.sopDocument.update({
        where: { id: doc.id },
        data: { status: 'failed', errorMessage: msg },
      });

      throw new ServiceUnavailableException(
        `Gagal memproses dokumen SOP: ${msg}`,
      );
    }
  }

  // ─── List ────────────────────────────────────────────────────────────────

  async findAll(currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);
    this.guardRole(user.role.name);

    const docs = await this.prisma.sopDocument.findMany({
      where: { laboratoryId: user.laboratoryId },
      orderBy: { createdAt: 'desc' },
      select: {
        id:               true,
        title:            true,
        originalFilename: true,
        status:           true,
        chunkCount:       true,
        errorMessage:     true,
        sizeBytes:        true,
        indexedAt:        true,
        createdAt:        true,
        uploadedBy:       { select: { fullName: true } },
      },
    });

    return { data: docs };
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async remove(id: string, currentUser: RequestUser) {
    const user = await this.resolveUser(currentUser);
    this.guardRole(user.role.name);

    const doc = await this.prisma.sopDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Dokumen SOP tidak ditemukan');
    if (doc.laboratoryId !== user.laboratoryId) {
      throw new ForbiddenException('Dokumen tidak tersedia untuk laboratorium Anda');
    }

    // Delete index in AI Service — best effort, don't block on failure
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      try {
        await fetch(`${this.aiUrl}/ai/v1/sop-documents/${id}/index`, {
          method: 'DELETE',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to delete index for SopDocument ${id}: ${msg}`);
    }

    await this.prisma.sopDocument.delete({ where: { id } });

    return { message: 'Dokumen SOP berhasil dihapus' };
  }
}
