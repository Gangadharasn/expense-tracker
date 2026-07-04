import { BudgetBucket, TransactionType } from '../common/enums';
import { FinancialProfile } from '../common/interfaces';

export const DEFAULT_PROFILE: FinancialProfile = {
  monthlySalary: 150000,
  monthlyExpenseTarget: 80000,
  monthlySavingsTarget: 70000,
  loanEmiMonthly: 30000,
  emergencyFundTarget: 600000,
  monthlySipTarget: 35000,
  monthlyChitTarget: 15000,
  creditCardSpendLimit: 40000,
};

export interface MonthlyGoalTemplate {
  name: string;
  icon: string;
  targetAmount: number;
  categoryName?: string;
  type: 'savings' | 'expense' | 'savings_total' | 'cc_limit' | 'payment';
}

export const DEFAULT_MONTHLY_GOALS: MonthlyGoalTemplate[] = [
  { name: 'SIP Investment', icon: '📈', targetAmount: 35000, categoryName: 'SIP - Mutual Fund', type: 'savings' },
  { name: 'Chit Payment', icon: '🏆', targetAmount: 15000, categoryName: 'Chit Fund', type: 'savings' },
  { name: 'Emergency Fund', icon: '🛡️', targetAmount: 10000, categoryName: 'Emergency Fund', type: 'savings' },
  { name: 'Total Monthly Savings', icon: '💰', targetAmount: 70000, type: 'savings_total' },
  { name: 'Loan EMI', icon: '🏦', targetAmount: 30000, categoryName: 'Loan EMI', type: 'expense' },
  { name: 'Pay Credit Card Bill', icon: '💳', targetAmount: 0, categoryName: 'Credit Card Bill Payment', type: 'payment' },
  { name: 'Credit Card Spend Limit', icon: '💳', targetAmount: 40000, type: 'cc_limit' },
];

export interface CategoryTemplate {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  standardAmount: number;
  bucket: BudgetBucket;
}

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  { name: 'Salary', type: TransactionType.DEPOSIT, icon: '💼', color: '#22c55e', standardAmount: 150000, bucket: BudgetBucket.INCOME },
  { name: 'Bonus', type: TransactionType.DEPOSIT, icon: '🎁', color: '#10b981', standardAmount: 0, bucket: BudgetBucket.INCOME },
  { name: 'Freelance', type: TransactionType.DEPOSIT, icon: '💻', color: '#14b8a6', standardAmount: 0, bucket: BudgetBucket.INCOME },

  { name: 'Loan EMI', type: TransactionType.EXPENSE, icon: '🏦', color: '#dc2626', standardAmount: 30000, bucket: BudgetBucket.LOAN },
  { name: 'Rent / Housing', type: TransactionType.EXPENSE, icon: '🏠', color: '#eab308', standardAmount: 25000, bucket: BudgetBucket.NEEDS },
  { name: 'Groceries', type: TransactionType.EXPENSE, icon: '🛒', color: '#84cc16', standardAmount: 10000, bucket: BudgetBucket.NEEDS },
  { name: 'Utilities', type: TransactionType.EXPENSE, icon: '💡', color: '#a3e635', standardAmount: 4000, bucket: BudgetBucket.NEEDS },
  { name: 'Transport', type: TransactionType.EXPENSE, icon: '🚗', color: '#f97316', standardAmount: 8000, bucket: BudgetBucket.NEEDS },
  { name: 'Mobile & Internet', type: TransactionType.EXPENSE, icon: '📱', color: '#fb923c', standardAmount: 2000, bucket: BudgetBucket.NEEDS },
  { name: 'Healthcare', type: TransactionType.EXPENSE, icon: '🏥', color: '#8b5cf6', standardAmount: 3000, bucket: BudgetBucket.NEEDS },
  { name: 'Insurance', type: TransactionType.EXPENSE, icon: '🛡️', color: '#7c3aed', standardAmount: 5000, bucket: BudgetBucket.NEEDS },

  { name: 'Dining Out', type: TransactionType.EXPENSE, icon: '🍽️', color: '#ef4444', standardAmount: 5000, bucket: BudgetBucket.WANTS },
  { name: 'Shopping', type: TransactionType.EXPENSE, icon: '🛍️', color: '#ec4899', standardAmount: 5000, bucket: BudgetBucket.WANTS },
  { name: 'Entertainment', type: TransactionType.EXPENSE, icon: '🎬', color: '#6366f1', standardAmount: 3000, bucket: BudgetBucket.WANTS },
  { name: 'Personal Care', type: TransactionType.EXPENSE, icon: '💇', color: '#a855f7', standardAmount: 2000, bucket: BudgetBucket.WANTS },
  { name: 'Miscellaneous', type: TransactionType.EXPENSE, icon: '📦', color: '#64748b', standardAmount: 3000, bucket: BudgetBucket.WANTS },

  { name: 'Credit Card Bill Payment', type: TransactionType.EXPENSE, icon: '💳', color: '#be185d', standardAmount: 0, bucket: BudgetBucket.NEEDS },

  { name: 'SIP - Mutual Fund', type: TransactionType.SAVING, icon: '📈', color: '#0ea5e9', standardAmount: 35000, bucket: BudgetBucket.SAVINGS },
  { name: 'Chit Fund', type: TransactionType.SAVING, icon: '🏆', color: '#06b6d4', standardAmount: 15000, bucket: BudgetBucket.SAVINGS },
  { name: 'Emergency Fund', type: TransactionType.SAVING, icon: '🛡️', color: '#0284c7', standardAmount: 10000, bucket: BudgetBucket.SAVINGS },
  { name: 'Extra Savings', type: TransactionType.SAVING, icon: '🎯', color: '#0891b2', standardAmount: 10000, bucket: BudgetBucket.SAVINGS },

  { name: 'ATM Withdrawal', type: TransactionType.WITHDRAWAL, icon: '🏧', color: '#f59e0b', standardAmount: 0, bucket: BudgetBucket.SYSTEM },
  { name: 'Account Transfer', type: TransactionType.TRANSFER, icon: '↔️', color: '#3b82f6', standardAmount: 0, bucket: BudgetBucket.SYSTEM },
];

export const BUCKET_LABELS: Record<string, string> = {
  [BudgetBucket.NEEDS]: 'Needs (Essentials)',
  [BudgetBucket.WANTS]: 'Wants (Lifestyle)',
  [BudgetBucket.SAVINGS]: 'Savings & Investments',
  [BudgetBucket.LOAN]: 'Loan EMI',
};

export function getStandardForCategory(
  categoryName: string,
  category?: { standardAmount?: number },
): number {
  if (category?.standardAmount != null && category.standardAmount > 0) {
    return category.standardAmount;
  }
  const template = CATEGORY_TEMPLATES.find(
    (t) => t.name.toLowerCase() === categoryName.toLowerCase(),
  );
  return template?.standardAmount ?? 0;
}

export function getBucketForCategory(
  categoryName: string,
  category?: { bucket?: BudgetBucket },
): BudgetBucket {
  if (category?.bucket) return category.bucket;
  const template = CATEGORY_TEMPLATES.find(
    (t) => t.name.toLowerCase() === categoryName.toLowerCase(),
  );
  return template?.bucket ?? BudgetBucket.SYSTEM;
}
