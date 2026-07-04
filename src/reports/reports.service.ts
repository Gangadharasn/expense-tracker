import { Injectable } from '@nestjs/common';
import { TransactionType } from '../common/enums';
import {
  CategoryBreakdown,
  DailyTrend,
  DashboardInsights,
  MonthlySummary,
  Transaction,
} from '../common/interfaces';
import { DEFAULT_PROFILE } from '../config/financial-profile';
import { DataService } from '../data/data.service';
import { IntelligenceService } from '../intelligence/intelligence.service';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Injectable()
export class ReportsService {
  constructor(
    private readonly dataService: DataService,
    private readonly intelligenceService: IntelligenceService,
  ) {}

  async getMonthlySummary(month: string, year: number): Promise<MonthlySummary> {
    const data = await this.dataService.getData();
    const transactions = data.transactions.filter(
      (t) => t.month === month && t.year === year,
    );

    return this.buildMonthlySummary(month, year, transactions, data.categories);
  }

  async getDashboard(month?: string, year?: number): Promise<DashboardInsights> {
    const data = await this.dataService.getData();
    const now = new Date();
    const targetMonth = month ?? now.toLocaleString('en-US', { month: 'long' });
    const targetYear = year ?? now.getFullYear();
    const profile = data.profile ?? { ...DEFAULT_PROFILE };

    const currentTransactions = data.transactions.filter(
      (t) => t.month === targetMonth && t.year === targetYear,
    );
    const currentMonth = this.buildMonthlySummary(
      targetMonth,
      targetYear,
      currentTransactions,
      data.categories,
    );

    const prevIndex = MONTHS.indexOf(targetMonth);
    let prevMonthName: string;
    let prevYear = targetYear;
    if (prevIndex === 0) {
      prevMonthName = MONTHS[11];
      prevYear = targetYear - 1;
    } else {
      prevMonthName = MONTHS[prevIndex - 1];
    }

    const prevTransactions = data.transactions.filter(
      (t) => t.month === prevMonthName && t.year === prevYear,
    );
    const previousMonth =
      prevTransactions.length > 0
        ? this.buildMonthlySummary(
            prevMonthName,
            prevYear,
            prevTransactions,
            data.categories,
          )
        : undefined;

    const yearTransactions = data.transactions.filter((t) => t.year === targetYear);
    const monthsWithData = new Set(
      yearTransactions.map((t) => t.month),
    ).size || 1;

    const totalIncome = yearTransactions
      .filter((t) => t.type === TransactionType.DEPOSIT)
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = yearTransactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((s, t) => s + t.amount, 0);
    const totalSavings = yearTransactions
      .filter((t) => t.type === TransactionType.SAVING)
      .reduce((s, t) => s + t.amount, 0);

    const intelligence = this.intelligenceService.analyze(
      profile,
      data.categories,
      data.accounts,
      data.monthlyGoals ?? [],
      currentTransactions,
      data.transactions,
      currentMonth,
      targetMonth,
      targetYear,
    );

    const insights = this.intelligenceService.generateAlerts(
      intelligence,
      currentMonth,
      previousMonth,
      currentTransactions,
    );

    return {
      currentMonth,
      previousMonth,
      insights,
      intelligence,
      accountBalances: data.accounts.map((a) => ({
        accountId: a.id,
        name: a.name,
        balance: a.balance,
      })),
      yearToDate: {
        totalIncome,
        totalExpense,
        totalSavings,
        avgMonthlyExpense: totalExpense / monthsWithData,
        avgSavingsRate:
          totalIncome > 0
            ? ((totalIncome - totalExpense) / totalIncome) * 100
            : 0,
      },
    };
  }

  async getYearOverview(year: number) {
    const summaries: MonthlySummary[] = [];
    for (const month of MONTHS) {
      summaries.push(await this.getMonthlySummary(month, year));
    }
    return summaries;
  }

  async getProfile() {
    const data = await this.dataService.getData();
    return data.profile ?? { ...DEFAULT_PROFILE };
  }

  private buildMonthlySummary(
    month: string,
    year: number,
    transactions: Transaction[],
    categories: { id: string; name: string; type: TransactionType }[],
  ): MonthlySummary {
    const totalIncome = this.sumByType(transactions, TransactionType.DEPOSIT);
    const totalExpense = this.sumByType(transactions, TransactionType.EXPENSE);
    const totalSavings = this.sumByType(transactions, TransactionType.SAVING);
    const totalTransfers = this.sumByType(transactions, TransactionType.TRANSFER);
    const totalWithdrawals = this.sumByType(transactions, TransactionType.WITHDRAWAL);

    const categoryMap = new Map<string, CategoryBreakdown>();

    for (const t of transactions) {
      const cat = categories.find((c) => c.id === t.categoryId);
      const key = t.categoryId;
      const existing = categoryMap.get(key) ?? {
        categoryId: t.categoryId,
        categoryName: cat?.name ?? 'Unknown',
        type: t.type,
        total: 0,
        count: 0,
        percentage: 0,
      };
      existing.total += t.amount;
      existing.count += 1;
      categoryMap.set(key, existing);
    }

    const expenseTotal = totalExpense || 1;
    const categoryBreakdown = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        percentage:
          c.type === TransactionType.EXPENSE
            ? (c.total / expenseTotal) * 100
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const dailyMap = new Map<string, DailyTrend>();
    for (const t of transactions) {
      const dateKey = t.date.split('T')[0];
      const existing = dailyMap.get(dateKey) ?? {
        date: dateKey,
        income: 0,
        expense: 0,
        net: 0,
      };
      if (t.type === TransactionType.DEPOSIT) existing.income += t.amount;
      if (t.type === TransactionType.EXPENSE) existing.expense += t.amount;
      existing.net = existing.income - existing.expense;
      dailyMap.set(dateKey, existing);
    }

    const dailyTrend = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const netBalance = totalIncome - totalExpense - totalSavings;
    const savingsRate =
      totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      totalSavings,
      totalTransfers,
      totalWithdrawals,
      netBalance,
      savingsRate,
      transactionCount: transactions.length,
      categoryBreakdown,
      dailyTrend,
    };
  }

  private sumByType(transactions: Transaction[], type: TransactionType): number {
    return transactions
      .filter((t) => t.type === type)
      .reduce((s, t) => s + t.amount, 0);
  }
}
