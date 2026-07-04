import { Controller, Get, Query } from '@nestjs/common';
import { TransactionType } from '../common/enums';
import { CategoriesService } from './categories.service';

@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query('type') type?: TransactionType) {
    return this.categoriesService.findAll(type);
  }
}
