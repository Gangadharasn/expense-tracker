export enum TransactionType {
  EXPENSE = 'expense',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  SAVING = 'saving',
}

export enum StorageType {
  MEMORY = 'memory',
  JSON_FILE = 'json-file',
  SQLITE = 'sqlite',
  MONGODB = 'mongodb',
}

export enum BudgetBucket {
  INCOME = 'income',
  NEEDS = 'needs',
  WANTS = 'wants',
  SAVINGS = 'savings',
  LOAN = 'loan',
  SYSTEM = 'system',
}

export enum BudgetStatus {
  ON_TRACK = 'on_track',
  OVER = 'over',
  UNDER = 'under',
  MISSING = 'missing',
}
