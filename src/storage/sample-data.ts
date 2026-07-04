import { newId } from '../common/id';
import { TransactionType } from '../common/enums';
import { Account, Category, Transaction } from '../common/interfaces';

interface SampleTx {
  day: number;
  type: TransactionType;
  amount: number;
  description: string;
  categoryName: string;
  accountName: string;
  toAccountName?: string;
}

const SAMPLE_TRANSACTIONS: SampleTx[] = [
  { day: 1, type: TransactionType.DEPOSIT, amount: 150000, description: 'July Salary', categoryName: 'Salary', accountName: 'Bank Account' },
  { day: 2, type: TransactionType.EXPENSE, amount: 30000, description: 'Home Loan EMI', categoryName: 'Loan EMI', accountName: 'Bank Account' },
  { day: 1, type: TransactionType.EXPENSE, amount: 25000, description: 'Rent Payment', categoryName: 'Rent / Housing', accountName: 'Bank Account' },
  { day: 3, type: TransactionType.SAVING, amount: 35000, description: 'Monthly SIP', categoryName: 'SIP - Mutual Fund', accountName: 'Bank Account', toAccountName: 'SIP & Investments' },
  { day: 5, type: TransactionType.SAVING, amount: 15000, description: 'Chit Installment', categoryName: 'Chit Fund', accountName: 'Bank Account', toAccountName: 'SIP & Investments' },
  { day: 5, type: TransactionType.EXPENSE, amount: 8500, description: 'Weekly Groceries', categoryName: 'Groceries', accountName: 'Bank Account' },
  { day: 4, type: TransactionType.EXPENSE, amount: 3500, description: 'Electricity & Water', categoryName: 'Utilities', accountName: 'Bank Account' },
  { day: 7, type: TransactionType.EXPENSE, amount: 6000, description: 'Fuel & Cab', categoryName: 'Transport', accountName: 'Bank Account' },
  { day: 8, type: TransactionType.EXPENSE, amount: 3200, description: 'Dinner with friends', categoryName: 'Dining Out', accountName: 'Bank Account' },
  { day: 10, type: TransactionType.SAVING, amount: 5000, description: 'Emergency Fund', categoryName: 'Emergency Fund', accountName: 'Bank Account', toAccountName: 'SIP & Investments' },
  { day: 12, type: TransactionType.EXPENSE, amount: 4500, description: 'Amazon Shopping', categoryName: 'Shopping', accountName: 'HDFC Credit Card' },
  { day: 14, type: TransactionType.EXPENSE, amount: 1800, description: 'Netflix & Spotify', categoryName: 'Entertainment', accountName: 'Bank Account' },
];

function findCategory(categories: Category[], name: string): Category | undefined {
  return categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

function findAccount(accounts: Account[], name: string): Account | undefined {
  return accounts.find((a) => a.name.toLowerCase() === name.toLowerCase());
}

function isCreditCard(account?: Account): boolean {
  return account?.type === 'credit_card';
}

function applyBalanceChange(
  accounts: Account[],
  transaction: Transaction,
): void {
  const from = accounts.find((a) => a.id === transaction.accountId);
  if (!from) return;
  const to = transaction.toAccountId
    ? accounts.find((a) => a.id === transaction.toAccountId)
    : undefined;
  const fromIsCC = isCreditCard(from);
  const toIsCC = isCreditCard(to);

  switch (transaction.type) {
    case TransactionType.DEPOSIT:
      if (fromIsCC) from.balance -= transaction.amount;
      else from.balance += transaction.amount;
      break;
    case TransactionType.EXPENSE:
    case TransactionType.WITHDRAWAL:
      if (fromIsCC) from.balance += transaction.amount;
      else from.balance -= transaction.amount;
      break;
    case TransactionType.TRANSFER:
    case TransactionType.SAVING:
      if (!fromIsCC) from.balance -= transaction.amount;
      if (to) {
        if (toIsCC) to.balance -= transaction.amount;
        else to.balance += transaction.amount;
      }
      break;
  }
  from.updatedAt = new Date().toISOString();
  if (to) to.updatedAt = new Date().toISOString();
}

export function buildSampleTransactions(
  categories: Category[],
  accounts: Account[],
): Transaction[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const transactions: Transaction[] = [];

  for (const sample of SAMPLE_TRANSACTIONS) {
    const cat = findCategory(categories, sample.categoryName);
    const acc = findAccount(accounts, sample.accountName);
    if (!cat || !acc) continue;

    const toAcc = sample.toAccountName
      ? findAccount(accounts, sample.toAccountName)
      : undefined;

    const date = new Date(year, now.getMonth(), sample.day, 10, 0, 0);
    const iso = date.toISOString();
    const tx: Transaction = {
      id: newId(),
      type: sample.type,
      amount: sample.amount,
      description: sample.description,
      categoryId: cat.id,
      accountId: acc.id,
      toAccountId: toAcc?.id,
      date: iso,
      month,
      year,
      tags: ['sample'],
      notes: 'Demo data',
      createdAt: iso,
      updatedAt: iso,
    };
    applyBalanceChange(accounts, tx);
    transactions.push(tx);
  }

  return transactions;
}
