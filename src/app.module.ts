import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DataModule } from './data/data.module';
import { GoalsModule } from './goals/goals.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    StorageModule,
    AuthModule,
    DataModule,
    TransactionsModule,
    AccountsModule,
    CategoriesModule,
    GoalsModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
