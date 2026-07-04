import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateMonthlyGoalDto, UpdateMonthlyGoalDto } from './dto/goal.dto';
import { GoalsService } from './goals.service';

@Controller('api/goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  findAll() {
    return this.goalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.goalsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMonthlyGoalDto) {
    return this.goalsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMonthlyGoalDto) {
    return this.goalsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.goalsService.remove(id);
  }
}
