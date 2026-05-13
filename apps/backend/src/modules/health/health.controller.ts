import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const dbHealthy = await this.prisma.isHealthy();
    const status = dbHealthy ? 'ok' : 'error';
    const httpStatus = dbHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(httpStatus).json({
      status,
      service: 'labcermat-backend',
      version: this.config.get<string>('appVersion') ?? '1.0.0',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
    });
  }
}
