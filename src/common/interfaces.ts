import { BudgetBucket, TransactionType } from './enums';

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'savings' | 'wallet' | 'credit_card' | 'other';
  balance: number;
  currency: string;
  creditLimit?: number;
  billingDay?: number;
  dueDay?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  standardAmount?: number;
  bucket?: BudgetBucket;
}

export interface FinancialProfile {
  monthlySalary: number;
  monthlyExpenseTarget: number;
  monthlySavingsTarget: number;
  loanEmiMonthly: number;
  emergencyFundTarget: number;
  monthlySipTarget: number;
  monthlyChitTarget: number;
  creditCardSpendLimit: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  date: string;
  month: string;
  year: number;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyGoal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  categoryId?: string;
  type: 'savings' | 'expense' | 'savings_total' | 'cc_limit' | 'payment';
  active: boolean;
}

export interface MonthlyGoalStatus {
  goalId: string;
  name: string;
  icon: string;
  type: MonthlyGoal['type'];
  target: number;
  actual: number;
  difference: number;
  percentComplete: number;
  status: 'completed' | 'in_progress' | 'missed' | 'over_limit';
}

export interface CreditCardSummary {
  accountId: string;
  name: string;
  outstanding: number;
  creditLimit: number;
  availableCredit: number;
  utilizationPercent: number;
  monthlySpend: number;
  billingDay?: number;
  dueDay?: number;
}

export interface AppData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  profile?: FinancialProfile;
  monthlyGoals?: MonthlyGoal[];
}

export interface MonthlySummary {
  month: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  totalTransfers: number;
  totalWithdrawals: number;
  netBalance: number;
  savingsRate: number;
  transactionCount: number;
  categoryBreakdown: CategoryBreakdown[];
  dailyTrend: DailyTrend[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  type: TransactionType;
  total: number;
  count: number;
  percentage: number;
}

export interface DailyTrend {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'tip' | 'danger';
  title: string;
  message: string;
  value?: number;
  metric?: string;
  priority?: number;
}

export interface CategoryBudgetStatus {
  categoryId: string;
  categoryName: string;
  icon: string;
  bucket: BudgetBucket;
  type: TransactionType;
  standard: number;
  actual: number;
  difference: number;
  status: 'on_track' | 'over' | 'under' | 'missing';
  percentUsed: number;
}

export interface BucketBudgetStatus {
  bucket: BudgetBucket;
  label: string;
  standard: number;
  actual: number;
  difference: number;
  status: 'on_track' | 'over' | 'under';
  percentUsed: number;
}

export interface MonthTarget {
  month: string;
  year: number;
  incomeTarget: number;
  expenseTarget: number;
  savingsTarget: number;
  actualIncome: number;
  actualExpense: number;
  actualSavings: number;
  remainingBudget: number;
  savingsPercent: number;
  onTrack: boolean;
  healthScore: number;
  daysLeftInMonth: number;
  dailySpendAllowance: number;
}

export interface AiAnalysis {
  healthScore: number;
  healthLabel: string;
  summary: string;
  needsBudget: number;
  wantsBudget: number;
  needsActual: number;
  wantsActual: number;
  savingsActual: number;
  savingsTarget: number;
  projectedMonthEndExpense: number;
  dailyBurnRate: number;
}

export interface FinancialIntelligence {
  profile: FinancialProfile;
  bucketBudgets: BucketBudgetStatus[];
  categoryBudgets: CategoryBudgetStatus[];
  monthTarget: MonthTarget;
  aiAnalysis: AiAnalysis;
  monthlyGoals: MonthlyGoalStatus[];
  creditCards: CreditCardSummary[];
  salaryDeposited: boolean;
  salaryAmount: number;
}

export interface DashboardInsights {
  currentMonth: MonthlySummary;
  previousMonth?: MonthlySummary;
  insights: Insight[];
  intelligence: FinancialIntelligence;
  accountBalances: { accountId: string; name: string; balance: number }[];
  yearToDate: {
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    avgMonthlyExpense: number;
    avgSavingsRate: number;
  };
}
