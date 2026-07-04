import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { AppData } from '../common/interfaces';
import { createDefaultData } from './default-data';
import { IStorageService } from './storage.interface';

@Injectable()
export class JsonFileStorageService implements IStorageService {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AppData> {
    if (!existsSync(this.filePath)) {
      const defaultData = createDefaultData();
      await this.save(defaultData);
      return defaultData;
    }
    const raw = readFileSync(this.filePath, 'utf-8');
    return JSON.parse(raw) as AppData;
  }

  async save(data: AppData): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  getDataPath(): string {
    return this.filePath;
  }
}
