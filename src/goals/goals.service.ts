import { Injectable, NotFoundException } from '@nestjs/common';
import { newId } from '../common/id';
import { MonthlyGoal } from '../common/interfaces';
import { DataService } from '../data/data.service';
import { CreateMonthlyGoalDto, UpdateMonthlyGoalDto } from './dto/goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly dataService: DataService) {}

  async findAll() {
    const data = await this.dataService.getData();
    return data.monthlyGoals ?? [];
  }

  async findOne(id: string) {
    const goals = await this.findAll();
    const goal = goals.find((g) => g.id === id);
    if (!goal) throw new NotFoundException(`Goal ${id} not found`);
    return goal;
  }

  async create(dto: CreateMonthlyGoalDto) {
    const data = await this.dataService.getData();
    const goal: MonthlyGoal = {
      id: newId(),
      name: dto.name,
      icon: dto.icon ?? '🎯',
      targetAmount: dto.targetAmount,
      categoryId: dto.categoryId,
      type: dto.type,
      active: dto.active ?? true,
    };
    if (!data.monthlyGoals) data.monthlyGoals = [];
    data.monthlyGoals.push(goal);
    await this.dataService.persist(data);
    return goal;
  }

  async update(id: string, dto: UpdateMonthlyGoalDto) {
    const data = await this.dataService.getData();
    const index = (data.monthlyGoals ?? []).findIndex((g) => g.id === id);
    if (index === -1) throw new NotFoundException(`Goal ${id} not found`);
    data.monthlyGoals![index] = { ...data.monthlyGoals![index], ...dto };
    await this.dataService.persist(data);
    return data.monthlyGoals![index];
  }

  async remove(id: string) {
    const data = await this.dataService.getData();
    const index = (data.monthlyGoals ?? []).findIndex((g) => g.id === id);
    if (index === -1) throw new NotFoundException(`Goal ${id} not found`);
    data.monthlyGoals!.splice(index, 1);
    await this.dataService.persist(data);
    return { deleted: true, id };
  }
}
