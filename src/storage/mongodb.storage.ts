import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { AppData } from '../common/interfaces';
import { createDefaultData } from './default-data';
import { IStorageService } from './storage.interface';

const DOC_ID = 'main';
const DB_NAME = 'expense_tracker';
const COLLECTION = 'appdata';

let cachedClient: MongoClient | null = null;

async function getClient(uri: string): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

@Injectable()
export class MongoDbStorageService implements IStorageService, OnModuleDestroy {
  constructor(private readonly uri: string) {}

  private async collection() {
    const client = await getClient(this.uri);
    return client.db(DB_NAME).collection<AppData & { _id: string }>(COLLECTION);
  }

  async load(): Promise<AppData> {
    const col = await this.collection();
    const doc = await col.findOne({ _id: DOC_ID });
    if (!doc) {
      const defaultData = createDefaultData();
      await this.save(defaultData);
      return defaultData;
    }
    const { _id, ...data } = doc;
    void _id;
    return data as AppData;
  }

  async save(data: AppData): Promise<void> {
    const col = await this.collection();
    const doc = { _id: DOC_ID, ...data };
    await col.replaceOne({ _id: DOC_ID }, doc, { upsert: true });
  }

  getDataPath(): string {
    const host = this.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    return `MongoDB Atlas → ${DB_NAME}.${COLLECTION} (${host})`;
  }

  async onModuleDestroy(): Promise<void> {
    if (cachedClient) {
      await cachedClient.close();
      cachedClient = null;
    }
  }
}
