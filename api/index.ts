import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { existsSync } from 'fs';
import { join } from 'path';

let cachedServer: express.Application;
let bootstrapError: Error | null = null;

function loadDistModule<T>(relativePath: string): T {
  const candidates = [
    join(process.cwd(), 'dist', 'src', relativePath),
    join(__dirname, '..', 'dist', 'src', relativePath),
    join(__dirname, 'dist', 'src', relativePath),
  ];

  for (const file of candidates) {
    if (existsSync(`${file}.js`) || existsSync(file)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(file) as T;
    }
  }

  throw new Error(
    `Cannot find compiled module "${relativePath}". Checked: ${candidates.join(', ')}`,
  );
}

async function createApp(): Promise<express.Application> {
  const { AppModule } = loadDistModule<{ AppModule: new () => unknown }>(
    'app.module',
  );
  const { getPublicDir } = loadDistModule<{ getPublicDir: () => string }>(
    'paths',
  );

  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));

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
  app.useStaticAssets(getPublicDir());

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
      message: 'Server error',
      error: bootstrapError.message,
    });
  }
}
