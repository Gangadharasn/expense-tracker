import { Global, Module } from '@nestjs/common';
import { join } from 'path';
import { StorageType } from '../common/enums';
import { JsonFileStorageService } from './json-file.storage';
import { MemoryStorageService } from './memory.storage';
import { MongoDbStorageService } from './mongodb.storage';
import { STORAGE_SERVICE } from './storage.interface';

function resolveStorageType(): StorageType {
  if (process.env.MONGODB_URI) {
    return StorageType.MONGODB;
  }
  if (process.env.VERCEL) {
    return StorageType.MEMORY;
  }
  return (process.env.STORAGE_TYPE || StorageType.JSON_FILE) as StorageType;
}

function resolveStorageProvider() {
  const storageType = resolveStorageType();
  const dataDir = process.env.VERCEL
    ? '/tmp'
    : process.env.DATA_DIR || join(process.cwd(), 'data');

  switch (storageType) {
    case StorageType.MONGODB:
      return {
        provide: STORAGE_SERVICE,
        useFactory: () => new MongoDbStorageService(process.env.MONGODB_URI!),
      };
    case StorageType.MEMORY:
      return { provide: STORAGE_SERVICE, useClass: MemoryStorageService };
    case StorageType.SQLITE:
      return {
        provide: STORAGE_SERVICE,
        useFactory: () => {
          try {
            const { SqliteStorageService } = require('./sqlite.storage') as {
              SqliteStorageService: new (path: string) => unknown;
            };
            return new SqliteStorageService(join(dataDir, 'expenses.db'));
          } catch {
            throw new Error(
              'SQLite storage unavailable (better-sqlite3 not installed)',
            );
          }
        },
      };
    case StorageType.JSON_FILE:
    default:
      return {
        provide: STORAGE_SERVICE,
        useFactory: () => new JsonFileStorageService(join(dataDir, 'expenses.json')),
      };
  }
}

@Global()
@Module({
  providers: [resolveStorageProvider()],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
