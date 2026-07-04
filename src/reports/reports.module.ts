import { Module } from '@nestjs/common';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [IntelligenceModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
