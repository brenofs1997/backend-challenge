import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { WagerTransactionKind } from '../../../../domain/wager-transaction/wager-transaction-kind';

const MONEY_AMOUNT_PATTERN = /^\d+\.\d{2}$/;

class MoneyDto {
  @IsString()
  @Matches(MONEY_AMOUNT_PATTERN)
  amount!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;
}

export class SubmitWagerDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsString()
  @IsNotEmpty()
  externalTransactionId!: string;

  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @IsString()
  @IsNotEmpty()
  walletId!: string;

  @IsString()
  @IsNotEmpty()
  roundId!: string;

  @IsString()
  @IsNotEmpty()
  gameId!: string;

  @IsEnum(WagerTransactionKind)
  kind!: WagerTransactionKind;

  @ValidateNested()
  @Type(() => MoneyDto)
  money!: MoneyDto;

  @IsOptional()
  @IsString()
  referenceExternalTransactionId?: string;
}
