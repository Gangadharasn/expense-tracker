import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsEnum(['cash', 'bank', 'savings', 'wallet', 'credit_card', 'other'])
  type: 'cash' | 'bank' | 'savings' | 'wallet' | 'credit_card' | 'other';

  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  billingDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  dueDay?: number;
}
