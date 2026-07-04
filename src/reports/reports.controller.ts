import { Controller, Get, Query } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { ReportsService } from './reports.service';

@Controller('api/reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly dataService: DataService,
  ) {}

  @Get('dashboard')
  getDashboard(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.getDashboard(
      month,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('monthly')
  getMonthly(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.reportsService.getMonthlySummary(
      month,
      parseInt(year, 10),
    );
  }

  @Get('year')
  getYear(@Query('year') year: string) {
    return this.reportsService.getYearOverview(parseInt(year, 10));
  }

  @Get('profile')
  getProfile() {
    return this.reportsService.getProfile();
  }

  @Get('storage-info')
  getStorageInfo() {
    return this.dataService.getStorageInfo();
  }
}
