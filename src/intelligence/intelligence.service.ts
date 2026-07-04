import { Injectable } from '@nestjs/common';
import { BudgetBucket, TransactionType } from '../common/enums';
import {
  Account,
  BucketBudgetStatus,
  Category,
  CategoryBudgetStatus,
  CreditCardSummary,
  FinancialIntelligence,
  FinancialProfile,
  GoalProgress,
  Insight,
  MonthlyGoal,
  MonthlyGoalStatus,
  MonthlySummary,
  Transaction,
} from '../common/interfaces';
import {
  BUCKET_LABELS,
  DEFAULT_PROFILE,
  getBucketForCategory,
  getStandardForCategory,
} from '../config/financial-profile';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Injectable()
export class IntelligenceService {
  analyze(
    profile: FinancialProfile,
    categories: Category[],
    accounts: Account[],
    monthlyGoals: MonthlyGoal[],
    monthTransactions: Transaction[],
    allTransactions: Transaction[],
    currentMonth: MonthlySummary,
    targetMonth: string,
    targetYear: number,
  ): FinancialIntelligence {
    const categoryBudgets = this.buildCategoryBudgets(
      categories,
      monthTransactions,
    );
    const bucketBudgets = this.buildBucketBudgets(categoryBudgets);
    const goalProgress = this.buildGoalProgress(
      profile,
      allTransactions,
      currentMonth,
      targetMonth,
      targetYear,
    );
    const monthlyGoalStatuses = this.buildMonthlyGoalStatuses(
      monthlyGoals,
      categories,
      accounts,
      monthTransactions,
      currentMonth,
      profile,
    );
    const creditCards = this.buildCreditCardSummaries(
      accounts,
      monthTransactions,
    );

    const salaryCategory = categories.find((c) =>
      c.name.toLowerCase().includes('salary'),
    );
    const salaryTxs = monthTransactions.filter(
      (t) =>
        t.type === TransactionType.DEPOSIT &&
        (salaryCategory ? t.categoryId === salaryCategory.id : true),
    );
    const salaryAmount = salaryTxs.reduce((s, t) => s + t.amount, 0);

    return {
      profile,
      categoryBudgets,
      bucketBudgets,
      goalProgress,
      monthlyGoals: monthlyGoalStatuses,
      creditCards,
      salaryDeposited: salaryAmount >= profile.monthlySalary * 0.9,
      salaryAmount,
    };
  }

  generateAlerts(
    intelligence: FinancialIntelligence,
    current: MonthlySummary,
    previous?: MonthlySummary,
  ): Insight[] {
    const alerts: Insight[] = [];
    const { profile, goalProgress, bucketBudgets, categoryBudgets, salaryDeposited, salaryAmount, monthlyGoals, creditCards } =
      intelligence;

    if (!salaryDeposited) {
      alerts.push({
        id: 'salary-missing',
        type: 'danger',
        priority: 1,
        title: '⚠️ Salary Not Deposited',
        message: `No salary recorded this month. Expected ₹${profile.monthlySalary.toLocaleString('en-IN')}. Add your salary deposit first to track budget.`,
        metric: 'salary',
      });
    } else if (salaryAmount < profile.monthlySalary) {
      alerts.push({
        id: 'salary-low',
        type: 'warning',
        priority: 2,
        title: 'Salary Below Expected',
        message: `Received ₹${salaryAmount.toLocaleString('en-IN')} vs expected ₹${profile.monthlySalary.toLocaleString('en-IN')}. Budget targets are based on ₹1.5L.`,
        value: salaryAmount,
        metric: 'salary',
      });
    }

    if (!goalProgress.onTrack) {
      alerts.push({
        id: 'goal-off-track',
        type: 'danger',
        priority: 1,
        title: '🎯 2 Cr Goal — OFF TRACK',
        message: `You need ₹${this.fmt(goalProgress.requiredMonthlyInvestment)}/month to reach ₹2 Cr in ${goalProgress.yearsRemaining} years. Currently saving ₹${this.fmt(goalProgress.actualMonthlySavings)}/month. Gap: ₹${this.fmt(goalProgress.gap)}/month.`,
        value: goalProgress.gap,
        metric: 'goalGap',
      });
    } else {
      alerts.push({
        id: 'goal-on-track',
        type: 'success',
        priority: 5,
        title: '🎯 2 Cr Goal — On Track',
        message: `Great! Saving ₹${this.fmt(goalProgress.actualMonthlySavings)}/month. Total progress: ${goalProgress.percentComplete.toFixed(1)}% (₹${this.fmt(goalProgress.totalProgress)} of ₹2 Cr).`,
        value: goalProgress.percentComplete,
        metric: 'goalProgress',
      });
    }

    for (const bucket of bucketBudgets) {
      if (bucket.bucket === BudgetBucket.SAVINGS && bucket.status === 'under') {
        alerts.push({
          id: 'savings-under',
          type: 'danger',
          priority: 2,
          title: '💰 Savings Below Target',
          message: `${bucket.label}: saved ₹${this.fmt(bucket.actual)} vs target ₹${this.fmt(bucket.standard)}. Short by ₹${this.fmt(Math.abs(bucket.difference))}. Increase SIP/Chit immediately.`,
          value: bucket.difference,
          metric: 'savings',
        });
      }
      if (bucket.bucket === BudgetBucket.WANTS && bucket.status === 'over') {
        alerts.push({
          id: 'wants-over',
          type: 'warning',
          priority: 3,
          title: '🛍️ Lifestyle Spending Over Budget',
          message: `Wants spending ₹${this.fmt(bucket.actual)} exceeds budget ₹${this.fmt(bucket.standard)} by ₹${this.fmt(bucket.difference)}. Cut dining/shopping to fund your 2 Cr goal.`,
          value: bucket.difference,
          metric: 'wants',
        });
      }
      if (bucket.bucket === BudgetBucket.NEEDS && bucket.status === 'over') {
        alerts.push({
          id: 'needs-over',
          type: 'warning',
          priority: 3,
          title: '🏠 Essential Expenses Over Budget',
          message: `Needs spending ₹${this.fmt(bucket.actual)} vs budget ₹${this.fmt(bucket.standard)}. Review rent, groceries, or transport.`,
          value: bucket.difference,
          metric: 'needs',
        });
      }
    }

    const sip = categoryBudgets.find((c) =>
      c.categoryName.toLowerCase().includes('sip'),
    );
    if (sip && sip.status === 'under') {
      alerts.push({
        id: 'sip-under',
        type: 'warning',
        priority: 2,
        title: '📈 SIP Below Target',
        message: `SIP: ₹${this.fmt(sip.actual)} vs target ₹${this.fmt(sip.standard)}. Short by ₹${this.fmt(Math.abs(sip.difference))}. This delays your 2 Cr goal.`,
        value: sip.difference,
        metric: 'sip',
      });
    }

    const chit = categoryBudgets.find((c) =>
      c.categoryName.toLowerCase().includes('chit'),
    );
    if (chit && chit.status === 'under') {
      alerts.push({
        id: 'chit-under',
        type: 'warning',
        priority: 3,
        title: '🏆 Chit Payment Missing',
        message: `Chit: ₹${this.fmt(chit.actual)} vs target ₹${this.fmt(chit.standard)}. Don't miss chit installments.`,
        value: chit.difference,
        metric: 'chit',
      });
    }

    const loan = categoryBudgets.find((c) =>
      c.categoryName.toLowerCase().includes('loan') ||
      c.categoryName.toLowerCase().includes('emi'),
    );
    if (loan && loan.status === 'missing') {
      alerts.push({
        id: 'loan-missing',
        type: 'warning',
        priority: 3,
        title: '🏦 Loan EMI Not Recorded',
        message: `₹${this.fmt(profile.loanEmiMonthly)} EMI not logged this month. Record it to keep accounts accurate.`,
        metric: 'loan',
      });
    } else if (loan && loan.status === 'over') {
      alerts.push({
        id: 'loan-over',
        type: 'info',
        priority: 4,
        title: 'Loan EMI Paid (Extra?)',
        message: `Loan payment ₹${this.fmt(loan.actual)} exceeds standard ₹${this.fmt(loan.standard)}.`,
      });
    }

    const overspent = categoryBudgets.filter(
      (c) => c.status === 'over' && c.standard > 0,
    );
    for (const cat of overspent.slice(0, 3)) {
      alerts.push({
        id: `over-${cat.categoryId}`,
        type: 'warning',
        priority: 4,
        title: `${cat.icon} ${cat.categoryName} Over Budget`,
        message: `Spent ₹${this.fmt(cat.actual)} vs budget ₹${this.fmt(cat.standard)} (+₹${this.fmt(cat.difference)}). ${cat.percentUsed.toFixed(0)}% of limit used.`,
        value: cat.difference,
        metric: 'category',
      });
    }

    if (current.netBalance < 0) {
      alerts.push({
        id: 'deficit',
        type: 'danger',
        priority: 1,
        title: '🚨 Monthly Deficit',
        message: `Spending ₹${this.fmt(Math.abs(current.netBalance))} more than income. You cannot reach 2 Cr with a deficit — cut wants immediately.`,
        value: current.netBalance,
        metric: 'deficit',
      });
    }

    const savingsRate =
      current.totalIncome > 0
        ? (current.totalSavings / current.totalIncome) * 100
        : 0;
    const targetRate = (profile.monthlySavingsTarget / profile.monthlySalary) * 100;
    if (current.totalIncome > 0 && savingsRate < targetRate - 5) {
      alerts.push({
        id: 'savings-rate-low',
        type: 'warning',
        priority: 2,
        title: 'Savings Rate Too Low',
        message: `Saving ${savingsRate.toFixed(0)}% of income. Target is ${targetRate.toFixed(0)}% (₹${this.fmt(profile.monthlySavingsTarget)}/month) for your 2 Cr plan.`,
        value: savingsRate,
        metric: 'savingsRate',
      });
    }

    if (previous && previous.totalExpense > 0) {
      const change =
        ((current.totalExpense - previous.totalExpense) / previous.totalExpense) *
        100;
      if (change > 15) {
        alerts.push({
          id: 'expense-spike',
          type: 'warning',
          priority: 3,
          title: 'Expense Spike vs Last Month',
          message: `Expenses up ${change.toFixed(0)}% (${this.fmt(previous.totalExpense)} → ${this.fmt(current.totalExpense)}).`,
          value: change,
        });
      }
    }

    for (const mg of monthlyGoals) {
      if (mg.status === 'missed' || mg.status === 'over_limit') {
        alerts.push({
          id: `mgoal-${mg.goalId}`,
          type: mg.type === 'cc_limit' ? 'danger' : 'warning',
          priority: mg.type === 'savings' || mg.type === 'savings_total' ? 2 : 3,
          title: `${mg.icon} Monthly Goal: ${mg.name}`,
          message:
            mg.status === 'over_limit'
              ? `Exceeded limit! ${this.fmt(mg.actual)} vs max ${this.fmt(mg.target)} (+${this.fmt(mg.difference)}).`
              : `Behind target. ${this.fmt(mg.actual)} of ${this.fmt(mg.target)} (${mg.percentComplete.toFixed(0)}% done). Short by ${this.fmt(Math.abs(mg.difference))}.`,
          value: mg.difference,
          metric: 'monthlyGoal',
        });
      } else if (mg.status === 'completed') {
        alerts.push({
          id: `mgoal-ok-${mg.goalId}`,
          type: 'success',
          priority: 6,
          title: `${mg.icon} ${mg.name} — Done!`,
          message: `Monthly goal achieved: ${this.fmt(mg.actual)} / ${this.fmt(mg.target)}.`,
        });
      }
    }

    for (const cc of creditCards) {
      if (cc.utilizationPercent > 80) {
        alerts.push({
          id: `cc-util-${cc.accountId}`,
          type: 'danger',
          priority: 2,
          title: `💳 ${cc.name} — High Utilization`,
          message: `${cc.utilizationPercent.toFixed(0)}% used (₹${cc.outstanding.toLocaleString('en-IN')} of ₹${cc.creditLimit.toLocaleString('en-IN')}). Pay before due date to avoid interest.`,
          value: cc.utilizationPercent,
          metric: 'ccUtilization',
        });
      }
      if (cc.monthlySpend > profile.creditCardSpendLimit) {
        alerts.push({
          id: `cc-spend-${cc.accountId}`,
          type: 'warning',
          priority: 3,
          title: `💳 ${cc.name} — Monthly Spend Over Limit`,
          message: `Spent ${this.fmt(cc.monthlySpend)} on credit card vs limit ${this.fmt(profile.creditCardSpendLimit)}.`,
          value: cc.monthlySpend,
        });
      }
      if (cc.outstanding > 0 && cc.dueDay) {
        const today = new Date().getDate();
        if (today >= cc.dueDay - 3 && today <= cc.dueDay + 2) {
          alerts.push({
            id: `cc-due-${cc.accountId}`,
            type: 'warning',
            priority: 2,
            title: `💳 ${cc.name} — Bill Due Soon`,
            message: `Outstanding ${this.fmt(cc.outstanding)}. Due around day ${cc.dueDay} of month. Pay via "Credit Card Bill Payment" or Transfer to card.`,
            value: cc.outstanding,
          });
        }
      }
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 'all-good',
        type: 'success',
        priority: 10,
        title: '✅ All Good This Month',
        message: 'Salary logged, budgets on track, and savings aligned with your 2 Cr goal. Keep going!',
      });
    }

    return alerts.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  }

  private buildCategoryBudgets(
    categories: Category[],
    transactions: Transaction[],
  ): CategoryBudgetStatus[] {
    const budgets: CategoryBudgetStatus[] = [];

    const budgetCategories = categories.filter(
      (c) =>
        c.type === TransactionType.EXPENSE ||
        c.type === TransactionType.SAVING,
    );

    for (const cat of budgetCategories) {
      const standard = getStandardForCategory(cat.name, cat);
      if (standard <= 0 && cat.type === TransactionType.SAVING) continue;

      const actual = transactions
        .filter((t) => t.categoryId === cat.id)
        .reduce((s, t) => s + t.amount, 0);

      const bucket = getBucketForCategory(cat.name, cat);
      let status: CategoryBudgetStatus['status'];

      if (actual === 0 && standard > 0) {
        status = 'missing';
      } else if (cat.type === TransactionType.SAVING) {
        status =
          actual >= standard * 0.95
            ? 'on_track'
            : actual >= standard * 0.5
              ? 'under'
              : 'under';
      } else if (actual > standard * 1.05) {
        status = 'over';
      } else if (actual < standard * 0.5 && standard > 0) {
        status = 'on_track';
      } else {
        status = 'on_track';
      }

      if (cat.type === TransactionType.SAVING && actual < standard * 0.95) {
        status = actual === 0 ? 'missing' : 'under';
      }

      budgets.push({
        categoryId: cat.id,
        categoryName: cat.name,
        icon: cat.icon,
        bucket,
        type: cat.type,
        standard,
        actual,
        difference:
          cat.type === TransactionType.SAVING
            ? actual - standard
            : actual - standard,
        status,
        percentUsed: standard > 0 ? (actual / standard) * 100 : 0,
      });
    }

    return budgets
      .filter((b) => b.standard > 0 || b.actual > 0)
      .sort((a, b) => {
        const order = { over: 0, missing: 1, under: 2, on_track: 3 };
        return order[a.status] - order[b.status] || b.difference - a.difference;
      });
  }

  private buildBucketBudgets(
    categoryBudgets: CategoryBudgetStatus[],
  ): BucketBudgetStatus[] {
    const buckets = [BudgetBucket.LOAN, BudgetBucket.NEEDS, BudgetBucket.WANTS, BudgetBucket.SAVINGS];

    return buckets.map((bucket) => {
      const items = categoryBudgets.filter((c) => c.bucket === bucket);
      const standard = items.reduce((s, c) => s + c.standard, 0);
      const actual = items.reduce((s, c) => s + c.actual, 0);
      const difference =
        bucket === BudgetBucket.SAVINGS ? actual - standard : actual - standard;

      let status: BucketBudgetStatus['status'] = 'on_track';
      if (bucket === BudgetBucket.SAVINGS) {
        status = actual >= standard * 0.95 ? 'on_track' : 'under';
      } else {
        status = actual > standard * 1.05 ? 'over' : 'on_track';
      }

      return {
        bucket,
        label: BUCKET_LABELS[bucket] ?? bucket,
        standard,
        actual,
        difference,
        status,
        percentUsed: standard > 0 ? (actual / standard) * 100 : 0,
      };
    });
  }

  private buildMonthlyGoalStatuses(
    goals: MonthlyGoal[],
    categories: Category[],
    accounts: Account[],
    monthTransactions: Transaction[],
    currentMonth: MonthlySummary,
    profile: FinancialProfile,
  ): MonthlyGoalStatus[] {
    const ccAccountIds = new Set(
      accounts.filter((a) => a.type === 'credit_card').map((a) => a.id),
    );

    return goals
      .filter((g) => g.active)
      .map((goal) => {
        let actual = 0;
        let target = goal.targetAmount;

        switch (goal.type) {
          case 'savings':
            if (goal.categoryId) {
              actual = monthTransactions
                .filter(
                  (t) =>
                    t.categoryId === goal.categoryId &&
                    t.type === TransactionType.SAVING,
                )
                .reduce((s, t) => s + t.amount, 0);
            }
            break;
          case 'expense':
            if (goal.categoryId) {
              actual = monthTransactions
                .filter(
                  (t) =>
                    t.categoryId === goal.categoryId &&
                    t.type === TransactionType.EXPENSE,
                )
                .reduce((s, t) => s + t.amount, 0);
            }
            break;
          case 'savings_total':
            actual = currentMonth.totalSavings;
            target = profile.monthlySavingsTarget;
            break;
          case 'cc_limit':
            actual = monthTransactions
              .filter(
                (t) =>
                  ccAccountIds.has(t.accountId) &&
                  t.type === TransactionType.EXPENSE,
              )
              .reduce((s, t) => s + t.amount, 0);
            target = profile.creditCardSpendLimit;
            break;
          case 'payment':
            if (goal.categoryId) {
              actual = monthTransactions
                .filter((t) => t.categoryId === goal.categoryId)
                .reduce((s, t) => s + t.amount, 0);
            }
            actual += monthTransactions
              .filter(
                (t) =>
                  t.type === TransactionType.TRANSFER &&
                  t.toAccountId &&
                  ccAccountIds.has(t.toAccountId),
              )
              .reduce((s, t) => s + t.amount, 0);
            const totalOutstanding = accounts
              .filter((a) => a.type === 'credit_card')
              .reduce((s, a) => s + a.balance, 0);
            target = totalOutstanding > 0 ? totalOutstanding : goal.targetAmount;
            break;
        }

        const difference =
          goal.type === 'savings' ||
          goal.type === 'savings_total' ||
          goal.type === 'payment'
            ? actual - target
            : actual - target;

        let status: MonthlyGoalStatus['status'] = 'in_progress';
        if (goal.type === 'cc_limit') {
          if (actual > target) status = 'over_limit';
          else if (actual >= target * 0.9) status = 'in_progress';
          else status = 'in_progress';
        } else if (
          goal.type === 'savings' ||
          goal.type === 'savings_total' ||
          goal.type === 'payment'
        ) {
          if (actual >= target * 0.95) status = 'completed';
          else if (actual === 0) status = 'missed';
          else status = 'in_progress';
        } else {
          if (actual >= target * 0.95) status = 'completed';
          else if (actual === 0) status = 'missed';
          else status = 'in_progress';
        }

        const percentComplete =
          target > 0 ? Math.min((actual / target) * 100, 150) : 0;

        return {
          goalId: goal.id,
          name: goal.name,
          icon: goal.icon,
          type: goal.type,
          target,
          actual,
          difference,
          percentComplete,
          status,
        };
      });
  }

  private buildCreditCardSummaries(
    accounts: Account[],
    monthTransactions: Transaction[],
  ): CreditCardSummary[] {
    return accounts
      .filter((a) => a.type === 'credit_card')
      .map((cc) => {
        const limit = cc.creditLimit ?? 0;
        const outstanding = cc.balance;
        const monthlySpend = monthTransactions
          .filter(
            (t) =>
              t.accountId === cc.id && t.type === TransactionType.EXPENSE,
          )
          .reduce((s, t) => s + t.amount, 0);

        return {
          accountId: cc.id,
          name: cc.name,
          outstanding,
          creditLimit: limit,
          availableCredit: Math.max(0, limit - outstanding),
          utilizationPercent: limit > 0 ? (outstanding / limit) * 100 : 0,
          monthlySpend,
          billingDay: cc.billingDay,
          dueDay: cc.dueDay,
        };
      });
  }

  private buildGoalProgress(
    profile: FinancialProfile,
    allTransactions: Transaction[],
    current: MonthlySummary,
    targetMonth: string,
    targetYear: number,
  ): GoalProgress {
    const totalSaved = allTransactions
      .filter((t) => t.type === TransactionType.SAVING)
      .reduce((s, t) => s + t.amount, 0);

    const totalProgress = totalSaved + profile.existingCorpus;
    const monthsRemaining = profile.goalYears * 12;
    const requiredMonthly = this.calcRequiredMonthlySip(
      profile.goalAmount - profile.existingCorpus,
      monthsRemaining,
      profile.sipAnnualReturn,
    );

    const actualMonthlySavings = current.totalSavings;
    const onTrack = actualMonthlySavings >= requiredMonthly * 0.85;
    const gap = Math.max(0, requiredMonthly - actualMonthlySavings);

    const projected = this.projectFutureValue(
      profile.existingCorpus + totalSaved,
      actualMonthlySavings,
      monthsRemaining,
      profile.sipAnnualReturn,
    );

    const startIdx = MONTHS.indexOf(profile.goalStartMonth);
    const currentIdx = MONTHS.indexOf(targetMonth);
    let monthsElapsed =
      (targetYear - profile.goalStartYear) * 12 + (currentIdx - startIdx);
    monthsElapsed = Math.max(0, monthsElapsed);

    return {
      goalAmount: profile.goalAmount,
      goalLabel: '2 Crore Goal',
      savedSoFar: totalSaved,
      existingCorpus: profile.existingCorpus,
      totalProgress,
      projectedAtCurrentRate: projected,
      requiredMonthlyInvestment: Math.round(requiredMonthly),
      actualMonthlySavings,
      monthsElapsed,
      monthsRemaining: Math.max(0, monthsRemaining - monthsElapsed),
      onTrack,
      gap: Math.round(gap),
      percentComplete: (totalProgress / profile.goalAmount) * 100,
      yearsRemaining: profile.goalYears,
    };
  }

  private calcRequiredMonthlySip(
    targetAmount: number,
    months: number,
    annualReturn: number,
  ): number {
    const r = annualReturn / 12;
    if (r === 0) return targetAmount / months;
    const factor = (Math.pow(1 + r, months) - 1) / r;
    return targetAmount / factor;
  }

  private projectFutureValue(
    currentCorpus: number,
    monthlySip: number,
    months: number,
    annualReturn: number,
  ): number {
    const r = annualReturn / 12;
    const compound = currentCorpus * Math.pow(1 + r, months);
    const sipFv =
      monthlySip > 0
        ? monthlySip * ((Math.pow(1 + r, months) - 1) / r)
        : 0;
    return Math.round(compound + sipFv);
  }

  private fmt(n: number): string {
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  getDefaultProfile(): FinancialProfile {
    return { ...DEFAULT_PROFILE };
  }
}
