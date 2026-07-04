import { AppData } from '../common/interfaces';

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface IStorageService {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  getDataPath(): string;
}
