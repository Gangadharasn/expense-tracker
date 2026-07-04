import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { join } from 'path';
import { AppModule } from '../dist/app.module';

let cachedServer: express.Application;
let bootstrapError: Error | null = null;

async function createApp(): Promise<express.Application> {
  const expressApp = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();
  app.useStaticAssets(join(process.cwd(), 'public'));

  await app.init();
  return expressApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (bootstrapError) {
      res.status(500).json({
        statusCode: 500,
        message: 'Server bootstrap failed',
        error: bootstrapError.message,
      });
      return;
    }

    if (!cachedServer) {
      cachedServer = await createApp();
    }

    return cachedServer(req, res);
  } catch (err) {
    bootstrapError = err instanceof Error ? err : new Error(String(err));
    console.error('Vercel handler error:', bootstrapError);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to load data — server error',
      error: bootstrapError.message,
    });
  }
}
