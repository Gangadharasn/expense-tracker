import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { getPublicDir } from './paths';

async function bootstrap() {
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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const storageType = process.env.STORAGE_TYPE || 'json-file';
  console.log(`\n  Expense Tracker running at http://localhost:${port}`);
  console.log(`  Storage: ${storageType}`);
  console.log(`  API: http://localhost:${port}/api/health\n`);
}
bootstrap();
