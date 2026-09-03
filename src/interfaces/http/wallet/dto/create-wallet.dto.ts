import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

const MONEY_AMOUNT_PATTERN = /^\d+\.\d{2}$/;

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY_AMOUNT_PATTERN, { message: 'initialBalance must have exactly 2 decimal places, e.g. "100.00"' })
  initialBalance?: string;
}