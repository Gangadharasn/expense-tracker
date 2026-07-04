import { Inject, Injectable } from '@nestjs/common';
import { newId } from '../common/id';
import { AppData, Category, FinancialProfile } from '../common/interfaces';
import { CATEGORY_TEMPLATES, DEFAULT_MONTHLY_GOALS, DEFAULT_PROFILE } from '../config/financial-profile';
import { buildDefaultGoals } from '../storage/default-data';
import { buildSampleTransactions } from '../storage/sample-data';
import type { IStorageService } from '../storage/storage.interface';
import { STORAGE_SERVICE } from '../storage/storage.interface';

@Injectable()
export class DataService {
  private cache: AppData | null = null;

  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: IStorageService,
  ) {}

  async getData(): Promise<AppData> {
    if (!this.cache) {
      let data = await this.storage.load();
      data = this.migrate(data);
      this.cache = data;
      await this.storage.save(data);
    }
    return this.cache;
  }

  async persist(data: AppData): Promise<void> {
    this.cache = data;
    await this.storage.save(data);
  }

  private migrate(data: AppData): AppData {
    if (!data.profile) {
      data.profile = { ...DEFAULT_PROFILE };
    } else {
      data.profile = {
        monthlySalary: data.profile.monthlySalary ?? DEFAULT_PROFILE.monthlySalary,
        monthlyExpenseTarget: (data.profile as FinancialProfile).monthlyExpenseTarget ?? DEFAULT_PROFILE.monthlyExpenseTarget,
        monthlySavingsTarget: data.profile.monthlySavingsTarget ?? DEFAULT_PROFILE.monthlySavingsTarget,
        loanEmiMonthly: data.profile.loanEmiMonthly ?? DEFAULT_PROFILE.loanEmiMonthly,
        emergencyFundTarget: data.profile.emergencyFundTarget ?? DEFAULT_PROFILE.emergencyFundTarget,
        monthlySipTarget: data.profile.monthlySipTarget ?? DEFAULT_PROFILE.monthlySipTarget,
        monthlyChitTarget: data.profile.monthlyChitTarget ?? DEFAULT_PROFILE.monthlyChitTarget,
        creditCardSpendLimit: data.profile.creditCardSpendLimit ?? DEFAULT_PROFILE.creditCardSpendLimit,
      };
    }

    const existingNames = new Set(data.categories.map((c) => c.name.toLowerCase()));
    for (const template of CATEGORY_TEMPLATES) {
      const existing = data.categories.find(
        (c) => c.name.toLowerCase() === template.name.toLowerCase(),
      );
      if (existing) {
        if (!existing.standardAmount) existing.standardAmount = template.standardAmount;
        if (!existing.bucket) existing.bucket = template.bucket;
      } else if (!existingNames.has(template.name.toLowerCase())) {
        data.categories.push({
          id: newId(),
          name: template.name,
          type: template.type,
          icon: template.icon,
          color: template.color,
          standardAmount: template.standardAmount,
          bucket: template.bucket,
        } as Category);
      }
    }

    if (!data.profile.creditCardSpendLimit) {
      data.profile.creditCardSpendLimit = 40000;
    }

    if (!data.monthlyGoals?.length) {
      data.monthlyGoals = buildDefaultGoals(data.categories);
    } else {
      for (const goal of data.monthlyGoals) {
        if (goal.categoryId) continue;
        const template = DEFAULT_MONTHLY_GOALS.find((t) => t.name === goal.name);
        if (template?.categoryName) {
          const cat = data.categories.find((c) => c.name === template.categoryName);
          if (cat) goal.categoryId = cat.id;
        }
      }
    }

    const hasCreditCard = data.accounts.some((a) => a.type === 'credit_card');
    if (!hasCreditCard) {
      const now = new Date().toISOString();
      data.accounts.push({
        id: newId(),
        name: 'HDFC Credit Card',
        type: 'credit_card',
        balance: 0,
        creditLimit: 200000,
        billingDay: 15,
        dueDay: 5,
        currency: 'INR',
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!data.transactions.length) {
      data.transactions = buildSampleTransactions(data.categories, data.accounts);
    }

    return data;
  }

  getStorageInfo(): { type: string; path: string } {
    if (process.env.MONGODB_URI) {
      return { type: 'mongodb', path: this.storage.getDataPath() };
    }
    const isVercel = !!process.env.VERCEL;
    const storageType = isVercel
      ? 'memory'
      : process.env.STORAGE_TYPE || 'json-file';
    return {
      type: storageType,
      path: this.storage.getDataPath(),
    };
  }
}
