import { v4 as uuidv4 } from 'uuid';
import { CATEGORY_TEMPLATES, DEFAULT_MONTHLY_GOALS, DEFAULT_PROFILE } from '../config/financial-profile';
import { AppData, MonthlyGoal } from '../common/interfaces';

export function createDefaultData(): AppData {
  const now = new Date().toISOString();
  const cashId = uuidv4();
  const bankId = uuidv4();
  const savingsId = uuidv4();
  const ccId = uuidv4();

  const categories = CATEGORY_TEMPLATES.map((t) => ({
    id: uuidv4(),
    name: t.name,
    type: t.type,
    icon: t.icon,
    color: t.color,
    standardAmount: t.standardAmount,
    bucket: t.bucket,
  }));

  const monthlyGoals = buildDefaultGoals(categories);

  return {
    accounts: [
      {
        id: cashId,
        name: 'Cash',
        type: 'cash',
        balance: 5000,
        currency: 'INR',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: bankId,
        name: 'Bank Account',
        type: 'bank',
        balance: 25000,
        currency: 'INR',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: savingsId,
        name: 'SIP & Investments',
        type: 'savings',
        balance: 0,
        currency: 'INR',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ccId,
        name: 'HDFC Credit Card',
        type: 'credit_card',
        balance: 0,
        creditLimit: 200000,
        billingDay: 15,
        dueDay: 5,
        currency: 'INR',
        createdAt: now,
        updatedAt: now,
      },
    ],
    categories,
    transactions: [],
    profile: { ...DEFAULT_PROFILE },
    monthlyGoals,
  };
}

export function buildDefaultGoals(
  categories: { id: string; name: string }[],
): MonthlyGoal[] {
  return DEFAULT_MONTHLY_GOALS.map((g) => {
    const cat = g.categoryName
      ? categories.find((c) => c.name === g.categoryName)
      : undefined;
    return {
      id: uuidv4(),
      name: g.name,
      icon: g.icon,
      targetAmount: g.targetAmount,
      categoryId: cat?.id,
      type: g.type,
      active: true,
    };
  });
}
