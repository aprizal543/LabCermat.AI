import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { SyncUserDto } from './dto/sync-user.dto';

@Controller('auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/sync-user
   * Sinkronisasi user Supabase Auth ke tabel public.users.
   * Dipanggil frontend setelah login pertama. Idempotent.
   */
  @Post('sync-user')
  @HttpCode(HttpStatus.OK)
  async syncUser(
    @CurrentUser() user: RequestUser,
    @Body() dto: SyncUserDto,
  ) {
    const result = await this.authService.syncUser(user, dto.fullName);

    return {
      data: result.user,
      synced: result.synced,
      message: result.synced
        ? 'User berhasil disinkronkan ke sistem'
        : 'User sudah tersinkron sebelumnya',
    };
  }

  /**
   * GET /api/v1/auth/me
   * Mengembalikan data user yang sedang login dari tabel public.users.
   */
  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    const data = await this.authService.getMe(user.supabaseId);
    return { data };
  }
}
