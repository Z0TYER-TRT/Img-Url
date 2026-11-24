import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// Works from the repo root and from apps/api (where `npm run start:dev` lands).
// Existing variables always win, so compose/env still overrides these files.
loadEnv();
loadEnv({ path: '../../.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const instance = app.getHttpAdapter().getInstance();
  instance.disable('x-powered-by');
  app.use(cookieParser());
  instance.set('trust proxy', 1);
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on ${port}`, 'Bootstrap');
}

void bootstrap();
