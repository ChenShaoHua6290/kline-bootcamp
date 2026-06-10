import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { getUploadRoot } from './common/uploads';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  const uploadRoot = getUploadRoot();
  if (!existsSync(uploadRoot)) mkdirSync(uploadRoot, { recursive: true });
  app.useStaticAssets(uploadRoot, { prefix: '/uploads/', maxAge: '30d' });
  app.useStaticAssets(uploadRoot, { prefix: '/api/uploads/', maxAge: '30d' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

bootstrap();
