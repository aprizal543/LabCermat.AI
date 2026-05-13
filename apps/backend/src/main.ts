import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3001;
  const corsOrigin = config.get<string>('corsOrigin') ?? 'http://localhost:5175';
  const appVersion = config.get<string>('appVersion') ?? '1.0.0';

  // Global prefix — semua endpoint menggunakan /api/v1
  app.setGlobalPrefix('api/v1');

  // CORS untuk development
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe — validasi DTO otomatis
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter — format error response standar
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);

  console.log(`\n🚀 LabCermat Backend v${appVersion} running`);
  console.log(`   http://localhost:${port}/api/v1/health\n`);
}

bootstrap().catch(console.error);
