import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';

let cachedServer: Express | null = null;
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

async function createApp(): Promise<Express> {
  const { AppModule } = loadDistModule<{ AppModule: new () => unknown }>(
    'app.module',
  );
  const { getPublicDir } = loadDistModule<{ getPublicDir: () => string }>(
    'paths',
  );

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
  return app.getHttpAdapter().getInstance() as Express;
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

    cachedServer(req, res);
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
