import { Global, Module } from '@nestjs/common';
import { join } from 'path';
import { StorageType } from '../common/enums';
import { JsonFileStorageService } from './json-file.storage';
import { MemoryStorageService } from './memory.storage';
import { STORAGE_SERVICE } from './storage.interface';

function resolveStorageProvider() {
  const isVercel = !!process.env.VERCEL;
  const storageType = (
    isVercel ? StorageType.MEMORY : process.env.STORAGE_TYPE || StorageType.JSON_FILE
  ) as StorageType;
  const dataDir = isVercel
    ? '/tmp'
    : process.env.DATA_DIR || join(process.cwd(), 'data');

  switch (storageType) {
    case StorageType.MEMORY:
      return { provide: STORAGE_SERVICE, useClass: MemoryStorageService };
    case StorageType.SQLITE:
      return {
        provide: STORAGE_SERVICE,
        useFactory: () => {
          // Lazy require — avoids loading better-sqlite3 on Vercel
          const { SqliteStorageService } = require('./sqlite.storage') as {
            SqliteStorageService: new (path: string) => unknown;
          };
          return new SqliteStorageService(join(dataDir, 'expenses.db'));
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
