import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMonthlyGoalDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsNumber()
  @Min(0)
  targetAmount: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(['savings', 'expense', 'savings_total', 'cc_limit', 'payment'])
  type: 'savings' | 'expense' | 'savings_total' | 'cc_limit' | 'payment';

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateMonthlyGoalDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetAmount?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(['savings', 'expense', 'savings_total', 'cc_limit', 'payment'])
  type?: 'savings' | 'expense' | 'savings_total' | 'cc_limit' | 'payment';

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
