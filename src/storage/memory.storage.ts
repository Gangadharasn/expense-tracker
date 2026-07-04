import { Injectable } from '@nestjs/common';
import { AppData } from '../common/interfaces';
import { createDefaultData } from './default-data';
import { IStorageService } from './storage.interface';

@Injectable()
export class MemoryStorageService implements IStorageService {
  private data: AppData = createDefaultData();

  async load(): Promise<AppData> {
    return structuredClone(this.data);
  }

  async save(data: AppData): Promise<void> {
    this.data = structuredClone(data);
  }

  getDataPath(): string {
    return 'in-memory (temporary — data lost on restart)';
  }
}
