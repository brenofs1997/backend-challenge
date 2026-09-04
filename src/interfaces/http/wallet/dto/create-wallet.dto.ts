import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches, ValidateNested } from 'class-validator';

const MONEY_AMOUNT_PATTERN = /^\d+\.\d{2}$/;

class InitialBalanceDto {
  @IsString()
  @Matches(MONEY_AMOUNT_PATTERN, { message: 'amount must have exactly 2 decimal places, e.g. "1000.00"' })
  amount!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;
}

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @ValidateNested()
  @Type(() => InitialBalanceDto)
  initialBalance!: InitialBalanceDto;
}