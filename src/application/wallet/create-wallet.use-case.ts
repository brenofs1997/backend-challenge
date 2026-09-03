import { Wallet } from '../../domain/wallet/wallet';
import { WalletLedgerEntry } from '../../domain/wallet/wallet-ledger-entry';
import { LedgerDirection } from '../../domain/wallet/ledger-direction';
import { WagerTransaction } from '../../domain/wager-transaction/wager-transaction';
import { Money } from '../../domain/shared/money';
import type { WalletRepository } from '../ports/wallet-repository';
import type { WagerTransactionRepository } from '../ports/wager-transaction-repository';
import type { WalletLedgerRepository } from '../ports/wallet-ledger-repository';
import type { UnitOfWork } from '../ports/unit-of-work';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

export class WalletAlreadyExistsError extends Error {}

export interface CreateWalletInput {
  playerId: string;
  currency: string;
  initialBalance?: Money;
}

export interface CreateWalletOutput {
  wallet: Wallet;
}

export class CreateWalletUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly wagerTransactionRepository: WagerTransactionRepository,
    private readonly walletLedgerRepository: WalletLedgerRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: CreateWalletInput): Promise<CreateWalletOutput> {
    const existing = await this.walletRepository.findByPlayerAndCurrency(input.playerId, input.currency);
    if (existing) {
      throw new WalletAlreadyExistsError(
        `Wallet already exists for player ${input.playerId} in ${input.currency}`,
      );
    }

    const now = this.clock.now();
    const initialBalance = input.initialBalance ?? Money.zero(input.currency);

    const wallet = Wallet.open({
      id: this.idGenerator.newId(),
      playerId: input.playerId,
      initialBalance,
      createdAt: now,
    });

    return this.unitOfWork.run(async () => {
      if (!initialBalance.isZero()) {
        await this.recordOpening(wallet, initialBalance, now);
      }
      await this.walletRepository.save(wallet);
      return { wallet };
    });
  }

  private async recordOpening(wallet: Wallet, amount: Money, now: Date): Promise<void> {
    const opening = WagerTransaction.createOpening({
      id: this.idGenerator.newId(),
      providerId: 'internal',
      externalTransactionId: wallet.id,
      idempotencyKey: `internal-opening:${wallet.id}`,
      payloadHash: 'internal-opening',
      walletId: wallet.id,
      playerId: wallet.playerId,
      roundId: 'internal',
      gameId: 'internal',
      money: amount,
      createdAt: now,
    });
    opening.markProcessed(undefined, now);

    const entry = WalletLedgerEntry.create({
      id: this.idGenerator.newId(),
      walletId: wallet.id,
      transactionId: opening.id,
      direction: LedgerDirection.Credit,
      money: amount,
      balanceBefore: Money.zero(amount.currency),
      balanceAfter: amount,
      createdAt: now,
    });

    await this.wagerTransactionRepository.save(opening);
    await this.walletLedgerRepository.append(entry);
  }
}
