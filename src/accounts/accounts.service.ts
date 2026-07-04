import { Injectable, NotFoundException } from '@nestjs/common';
import { newId } from '../common/id';
import { Account } from '../common/interfaces';
import { DataService } from '../data/data.service';
import { CreateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly dataService: DataService) {}

  async findAll() {
    const data = await this.dataService.getData();
    return data.accounts;
  }

  async findOne(id: string) {
    const data = await this.dataService.getData();
    const account = data.accounts.find((a) => a.id === id);
    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }
    return account;
  }

  async create(dto: CreateAccountDto) {
    const data = await this.dataService.getData();
    const now = new Date().toISOString();

    const account: Account = {
      id: newId(),
      name: dto.name,
      type: dto.type,
      balance: dto.type === 'credit_card' ? (dto.balance ?? 0) : (dto.balance ?? 0),
      currency: dto.currency ?? 'INR',
      creditLimit: dto.type === 'credit_card' ? (dto.creditLimit ?? 200000) : undefined,
      billingDay: dto.type === 'credit_card' ? dto.billingDay : undefined,
      dueDay: dto.type === 'credit_card' ? dto.dueDay : undefined,
      createdAt: now,
      updatedAt: now,
    };

    data.accounts.push(account);
    await this.dataService.persist(data);
    return account;
  }
}
