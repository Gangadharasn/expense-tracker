import { existsSync } from 'fs';
import { join } from 'path';

/** Resolve public folder for dev, local build, and Vercel */
export function getPublicDir(): string {
  const candidates = [
    join(process.cwd(), 'public'),
    join(__dirname, '..', '..', 'public'),
    join(__dirname, '..', 'public'),
    join(__dirname, '..'),
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) {
      return dir;
    }
  }

  return join(process.cwd(), 'public');
}
