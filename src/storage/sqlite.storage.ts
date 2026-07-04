import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { AppData } from '../common/interfaces';
import { createDefaultData } from './default-data';
import { IStorageService } from './storage.interface';

@Injectable()
export class SqliteStorageService implements IStorageService, OnModuleDestroy {
  private db: Database.Database;

  constructor(private readonly dbPath: string) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL NOT NULL,
        currency TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        categoryId TEXT NOT NULL,
        accountId TEXT NOT NULL,
        toAccountId TEXT,
        date TEXT NOT NULL,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        tags TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  }

  async load(): Promise<AppData> {
    const accountCount = this.db
      .prepare('SELECT COUNT(*) as count FROM accounts')
      .get() as { count: number };

    if (accountCount.count === 0) {
      const defaultData = createDefaultData();
      await this.save(defaultData);
      return defaultData;
    }

    const accounts = this.db.prepare('SELECT * FROM accounts').all();
    const categories = this.db.prepare('SELECT * FROM categories').all();
    const transactions = this.db
      .prepare('SELECT * FROM transactions ORDER BY date DESC')
      .all()
      .map((t: Record<string, unknown>) => ({
        ...t,
        tags: JSON.parse((t.tags as string) || '[]'),
      }));

    return { accounts, categories, transactions } as AppData;
  }

  async save(data: AppData): Promise<void> {
    const saveAll = this.db.transaction(() => {
      this.db.prepare('DELETE FROM accounts').run();
      this.db.prepare('DELETE FROM categories').run();
      this.db.prepare('DELETE FROM transactions').run();

      const insertAccount = this.db.prepare(`
        INSERT INTO accounts (id, name, type, balance, currency, createdAt, updatedAt)
        VALUES (@id, @name, @type, @balance, @currency, @createdAt, @updatedAt)
      `);
      for (const account of data.accounts) {
        insertAccount.run(account);
      }

      const insertCategory = this.db.prepare(`
        INSERT INTO categories (id, name, type, icon, color)
        VALUES (@id, @name, @type, @icon, @color)
      `);
      for (const category of data.categories) {
        insertCategory.run(category);
      }

      const insertTransaction = this.db.prepare(`
        INSERT INTO transactions (id, type, amount, description, categoryId, accountId, toAccountId, date, month, year, tags, notes, createdAt, updatedAt)
        VALUES (@id, @type, @amount, @description, @categoryId, @accountId, @toAccountId, @date, @month, @year, @tags, @notes, @createdAt, @updatedAt)
      `);
      for (const transaction of data.transactions) {
        insertTransaction.run({
          ...transaction,
          tags: JSON.stringify(transaction.tags),
          toAccountId: transaction.toAccountId ?? null,
          notes: transaction.notes ?? null,
        });
      }
    });

    saveAll();
  }

  getDataPath(): string {
    return this.dbPath;
  }

  onModuleDestroy(): void {
    this.db.close();
  }
}
