import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { validationSchema } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { SamplesModule } from './modules/samples/samples.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ResultsModule } from './modules/results/results.module';
import { QcInstrumentsModule } from './modules/qc-instruments/qc-instruments.module';
import { QcModule } from './modules/qc/qc.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { abortEarly: true },
    }),
    PrismaModule,
    SupabaseModule,
    HealthModule,
    AuthModule,
    SamplesModule,
    DashboardModule,
    ResultsModule,
    QcInstrumentsModule,
    QcModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
