import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Withdraw করার জন্য DTO
 * ইউজার যখন তার ব্যালেন্স থেকে টাকা তুলতে চায়
 */
export class CreateWithdrawDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Minimum withdraw amount is 1 USD' })
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'usd';
}

/**
 * Stripe Connected Account তৈরির জন্য DTO
 * ইউজার যখন প্রথমবার পেআউট সেটআপ করে
 */
export class CreateConnectedAccountDto {
  @IsOptional()
  @IsString()
  country?: string = 'US';
}

/**
 * Withdraw Request এর Response Type
 */
export interface WithdrawResponse {
  success: boolean;
  message: string;
  data?: {
    transfer_id?: string;
    amount?: number;
    currency?: string;
    status?: string;
  };
}
