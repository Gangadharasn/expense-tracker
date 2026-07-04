import { Injectable } from '@nestjs/common';
import { TransactionType } from '../common/enums';
import { DataService } from '../data/data.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly dataService: DataService) {}

  async findAll(type?: TransactionType) {
    const data = await this.dataService.getData();
    if (type) {
      return data.categories.filter((c) => c.type === type);
    }
    return data.categories;
  }
}
