import { Body, ConflictException, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Money } from '../../../domain/shared/money';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WalletResponse } from './dto/wallet.response';
import { toWalletResponse } from '../../../http/shared/wallet.mapper';
import { CreateWalletUseCase, WalletAlreadyExistsError } from '../../../application/wallet/create-wallet.use-case';

@Controller('wallets')
export class WalletController  {
  constructor(private readonly createWalletUseCase: CreateWalletUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateWalletDto): Promise<WalletResponse> {
    const initialBalance = dto.initialBalance
      ? Money.from({ amount: dto.initialBalance, currency: dto.currency })
      : undefined;

    try {
      const { wallet } = await this.createWalletUseCase.execute({
        playerId: dto.playerId,
        currency: dto.currency,
        ...(initialBalance !== undefined ? { initialBalance } : {}),
      });
      return toWalletResponse(wallet);
    } catch (error) {
      if (error instanceof WalletAlreadyExistsError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
