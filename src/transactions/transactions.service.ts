import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { newId } from '../common/id';
import { TransactionType } from '../common/enums';
import { Account, Transaction } from '../common/interfaces';
import { DataService } from '../data/data.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly dataService: DataService) {}

  async findAll(month?: string, year?: number, type?: TransactionType) {
    const data = await this.dataService.getData();
    let transactions = [...data.transactions];

    if (month) {
      transactions = transactions.filter((t) => t.month === month);
    }
    if (year) {
      transactions = transactions.filter((t) => t.year === year);
    }
    if (type) {
      transactions = transactions.filter((t) => t.type === type);
    }

    return transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async findOne(id: string) {
    const data = await this.dataService.getData();
    const transaction = data.transactions.find((t) => t.id === id);
    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return transaction;
  }

  async create(dto: CreateTransactionDto) {
    const data = await this.dataService.getData();
    this.validateTransaction(dto, data.accounts, data.categories);

    const date = new Date(dto.date);
    const now = new Date().toISOString();

    const transaction: Transaction = {
      id: newId(),
      type: dto.type,
      amount: dto.amount,
      description: dto.description,
      categoryId: dto.categoryId,
      accountId: dto.accountId,
      toAccountId: dto.toAccountId,
      date: dto.date,
      month: date.toLocaleString('en-US', { month: 'long' }),
      year: date.getFullYear(),
      tags: dto.tags ?? [],
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
    };

    this.applyBalanceChange(data.accounts, transaction, 'add');
    data.transactions.push(transaction);
    await this.dataService.persist(data);

    const warnings = this.checkWarnings(data, transaction);
    return { transaction, warnings };
  }

  private checkWarnings(
    data: Awaited<ReturnType<DataService['getData']>>,
    tx: Transaction,
  ): string[] {
    const warnings: string[] = [];
    const cat = data.categories.find((c) => c.id === tx.categoryId);
    const account = data.accounts.find((a) => a.id === tx.accountId);

    if (account?.type === 'credit_card' && tx.type === TransactionType.EXPENSE) {
      const limit = account.creditLimit ?? 0;
      const utilization = limit > 0 ? (account.balance / limit) * 100 : 0;
      if (utilization > 80) {
        warnings.push(
          `💳 Credit card ${account.name} at ${utilization.toFixed(0)}% utilization (₹${account.balance.toLocaleString('en-IN')} owed). Pay bill soon!`,
        );
      }
    }

    if (!cat) return warnings;

    const standard = cat.standardAmount ?? 0;
    const monthTxs = data.transactions.filter(
      (t) =>
        t.month === tx.month &&
        t.year === tx.year &&
        t.categoryId === tx.categoryId,
    );
    const total = monthTxs.reduce((s, t) => s + t.amount, 0);

    if (standard > 0 && tx.type === TransactionType.EXPENSE && total > standard) {
      warnings.push(
        `⚠️ ${cat.name} over budget! Spent ₹${total.toLocaleString('en-IN')} vs standard ₹${standard.toLocaleString('en-IN')}.`,
      );
    }
    if (tx.type === TransactionType.SAVING && standard > 0 && total < standard) {
      const short = standard - total;
      if (short > 0) {
        warnings.push(
          `💰 ${cat.name} still ₹${short.toLocaleString('en-IN')} short of monthly target ₹${standard.toLocaleString('en-IN')}.`,
        );
      }
    }
    if (
      cat.name.toLowerCase().includes('salary') &&
      tx.type === TransactionType.DEPOSIT
    ) {
      const profile = data.profile;
      if (profile && tx.amount >= profile.monthlySalary * 0.9) {
        warnings.push(
          `✅ Salary logged! Monthly goals and budgets are now active.`,
        );
      }
    }
    if (cat.name.toLowerCase().includes('credit card bill')) {
      warnings.push(`💳 Credit card bill payment recorded. Outstanding reduced.`);
    }

    return warnings;
  }

  async update(id: string, dto: UpdateTransactionDto) {
    const data = await this.dataService.getData();
    const index = data.transactions.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }

    const old = data.transactions[index];
    this.applyBalanceChange(data.accounts, old, 'reverse');

    const merged = { ...old, ...dto };
    const date = new Date(merged.date);
    merged.month = date.toLocaleString('en-US', { month: 'long' });
    merged.year = date.getFullYear();
    merged.updatedAt = new Date().toISOString();

    this.validateTransaction(merged, data.accounts, data.categories);
    this.applyBalanceChange(data.accounts, merged, 'add');

    data.transactions[index] = merged;
    await this.dataService.persist(data);

    return merged;
  }

  async remove(id: string) {
    const data = await this.dataService.getData();
    const index = data.transactions.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }

    const transaction = data.transactions[index];
    this.applyBalanceChange(data.accounts, transaction, 'reverse');
    data.transactions.splice(index, 1);
    await this.dataService.persist(data);

    return { deleted: true, id };
  }

  private isCreditCard(account?: Account): boolean {
    return account?.type === 'credit_card';
  }

  private availableCredit(account: Account): number {
    const limit = account.creditLimit ?? 0;
    return Math.max(0, limit - account.balance);
  }

  private validateTransaction(
    dto: CreateTransactionDto | Transaction,
    accounts: Account[],
    categories: { id: string }[],
  ) {
    const account = accounts.find((a) => a.id === dto.accountId);
    if (!account) {
      throw new BadRequestException('Source account not found');
    }

    const category = categories.find((c) => c.id === dto.categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    if (
      (dto.type === TransactionType.TRANSFER ||
        dto.type === TransactionType.SAVING) &&
      !dto.toAccountId
    ) {
      throw new BadRequestException(
        'Transfer and saving transactions require a destination account',
      );
    }

    if (dto.toAccountId) {
      const toAccount = accounts.find((a) => a.id === dto.toAccountId);
      if (!toAccount) {
        throw new BadRequestException('Destination account not found');
      }
      if (dto.accountId === dto.toAccountId) {
        throw new BadRequestException(
          'Source and destination accounts must be different',
        );
      }
    }

    const isFromCC = this.isCreditCard(account);
    const toAccount = dto.toAccountId
      ? accounts.find((a) => a.id === dto.toAccountId)
      : undefined;
    const isToCC = this.isCreditCard(toAccount);

    if (
      [TransactionType.EXPENSE, TransactionType.WITHDRAWAL].includes(dto.type) &&
      isFromCC
    ) {
      if (this.availableCredit(account) < dto.amount) {
        throw new BadRequestException(
          `Credit limit exceeded on ${account.name}. Available: ₹${this.availableCredit(account).toLocaleString('en-IN')} of ₹${(account.creditLimit ?? 0).toLocaleString('en-IN')}`,
        );
      }
    } else if (
      [TransactionType.EXPENSE, TransactionType.WITHDRAWAL, TransactionType.TRANSFER, TransactionType.SAVING].includes(
        dto.type,
      ) &&
      !isFromCC &&
      !isToCC &&
      account.balance < dto.amount
    ) {
      throw new BadRequestException(
        `Insufficient balance in ${account.name}. Available: ₹${account.balance}`,
      );
    } else if (dto.type === TransactionType.TRANSFER && isFromCC) {
      throw new BadRequestException(
        'Cannot transfer from a credit card account',
      );
    } else if (
      [TransactionType.EXPENSE, TransactionType.WITHDRAWAL, TransactionType.TRANSFER, TransactionType.SAVING].includes(
        dto.type,
      ) &&
      !isFromCC &&
      account.balance < dto.amount
    ) {
      throw new BadRequestException(
        `Insufficient balance in ${account.name}. Available: ₹${account.balance}`,
      );
    }
  }

  private applyBalanceChange(
    accounts: Account[],
    transaction: Transaction,
    mode: 'add' | 'reverse',
  ) {
    const sign = mode === 'add' ? 1 : -1;
    const from = accounts.find((a) => a.id === transaction.accountId);
    if (!from) return;
    const to = transaction.toAccountId
      ? accounts.find((a) => a.id === transaction.toAccountId)
      : undefined;

    const fromIsCC = this.isCreditCard(from);
    const toIsCC = this.isCreditCard(to);

    switch (transaction.type) {
      case TransactionType.DEPOSIT:
        if (fromIsCC) {
          from.balance -= sign * transaction.amount;
        } else {
          from.balance += sign * transaction.amount;
        }
        break;
      case TransactionType.EXPENSE:
      case TransactionType.WITHDRAWAL:
        if (fromIsCC) {
          from.balance += sign * transaction.amount;
        } else {
          from.balance -= sign * transaction.amount;
        }
        break;
      case TransactionType.TRANSFER:
      case TransactionType.SAVING:
        if (!fromIsCC) {
          from.balance -= sign * transaction.amount;
        }
        if (to) {
          if (toIsCC) {
            to.balance -= sign * transaction.amount;
          } else {
            to.balance += sign * transaction.amount;
          }
        }
        break;
    }

    from.updatedAt = new Date().toISOString();
    if (to) to.updatedAt = new Date().toISOString();
  }
}
