import { FailureCode } from '../../domain/wager-transaction/failure-code';
import { InsufficientBalanceError } from '../../domain/errors';
import { WagerTransaction } from '../../domain/wager-transaction/wager-transaction';
import { WagerTransactionPolicy } from '../../domain/wager-transaction/wager-transaction-policy';
import { WagerTransactionKind } from '../../domain/wager-transaction/wager-transaction-kind';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';
import type { UnitOfWork } from '../ports/unit-of-work';
import type { WalletLedgerRepository } from '../ports/wallet-ledger-repository';
import type { WalletRepository } from '../ports/wallet-repository';
import type { WagerTransactionRepository } from '../ports/wager-transaction-repository';
import type {
  ProcessWagerTransactionCommand,
  WagerTransactionProcessor,
} from '../ports/wager-transaction-processor';

export interface ProcessWagerTransactionOutput {
  transaction: WagerTransaction;
  balance: import('../../domain/shared/money').Money;
  idempotentReplay: boolean;
}

export class IdempotencyConflictError extends Error {}
export class WalletNotFoundError extends Error {}
export class ReferenceMismatchError extends Error {}
export class ReferenceAlreadyReversedError extends Error {}
export class ReversalAmountMismatchError extends Error {}

export class ProcessWagerTransactionUseCase
  implements WagerTransactionProcessor
{
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly wagerTransactionRepository: WagerTransactionRepository,
    private readonly walletLedgerRepository: WalletLedgerRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(
    command: ProcessWagerTransactionCommand,
  ): Promise<ProcessWagerTransactionOutput> {
    const existing = await this.wagerTransactionRepository.findByIdempotencyKey(
      command.idempotencyKey,
    );
    if (existing) {
      if (!existing.matchesPayload(command.payloadHash)) {
        throw new IdempotencyConflictError(
          `Idempotency key ${command.idempotencyKey} was already used with a different payload`,
        );
      }
      const wallet = await this.walletRepository.findById(existing.walletId);
      if (!wallet)
        throw new WalletNotFoundError(
          `Wallet ${existing.walletId} was not found`,
        );
      return {
        transaction: existing,
        balance: wallet.balance,
        idempotentReplay: true,
      };
    }

    return this.unitOfWork.runInTransaction(async () => {
      const transaction = WagerTransaction.create({
        id: this.idGenerator.newId(),
        providerId: command.providerId,
        externalTransactionId: command.externalTransactionId,
        idempotencyKey: command.idempotencyKey,
        payloadHash: command.payloadHash,
        walletId: command.walletId,
        playerId: command.playerId,
        roundId: command.roundId,
        gameId: command.gameId,
        kind: command.kind,
        money: command.money,
        referenceExternalTransactionId: command.referenceExternalTransactionId,
        createdAt: this.clock.now(),
      });

      const wallet = await this.walletRepository.findById(
        command.walletId,
        'PESSIMISTIC_WRITE',
      );
      if (!wallet)
        throw new WalletNotFoundError(
          `Wallet ${command.walletId} was not found`,
        );
      if (
        wallet.playerId !== command.playerId ||
        wallet.currency !== command.money.currency
      ) {
        transaction.reject(FailureCode.CurrencyMismatch);
        await this.wagerTransactionRepository.save(transaction);
        return {
          transaction,
          balance: wallet.balance,
          idempotentReplay: false,
        };
      }

      const reference = await this.resolveReference(transaction);
      if (transaction.requiresReference() && !reference) {
        transaction.markPendingReference();
        await this.wagerTransactionRepository.save(transaction);
        return {
          transaction,
          balance: wallet.balance,
          idempotentReplay: false,
        };
      }

      try {
        if (transaction.affectsBalance()) {
          const direction = WagerTransactionPolicy.ledgerDirectionFor(
            transaction.kind,
            reference?.ledgerDirectionFor(),
          );
          const entry =
            direction === 'DEBIT'
              ? wallet.debit({
                  ledgerEntryId: this.idGenerator.newId(),
                  transactionId: transaction.id,
                  money: transaction.money,
                  at: this.clock.now(),
                })
              : wallet.credit({
                  ledgerEntryId: this.idGenerator.newId(),
                  transactionId: transaction.id,
                  money: transaction.money,
                  at: this.clock.now(),
                });
          await this.walletLedgerRepository.append(entry);
          await this.walletRepository.save(wallet);
        }
        transaction.markProcessed(reference?.id, this.clock.now());
      } catch (error) {
        if (!(error instanceof InsufficientBalanceError)) throw error;
        transaction.reject(
          transaction.kind === WagerTransactionKind.Bet
            ? FailureCode.InsufficientFunds
            : FailureCode.ReversalWouldOverdraw,
        );
      }

      await this.wagerTransactionRepository.save(transaction);
      return { transaction, balance: wallet.balance, idempotentReplay: false };
    });
  }

  private async resolveReference(
    transaction: WagerTransaction,
  ): Promise<WagerTransaction | null> {
    if (!transaction.referenceExternalTransactionId) return null;
    const reference =
      await this.wagerTransactionRepository.findByExternalReference(
        transaction.providerId ?? '',
        transaction.referenceExternalTransactionId,
      );
    if (!reference) return null;
    if (
      reference.playerId !== transaction.playerId ||
      reference.walletId !== transaction.walletId ||
      reference.roundId !== transaction.roundId ||
      reference.money.currency !== transaction.money.currency
    ) {
      throw new ReferenceMismatchError(
        `Reference ${reference.id} does not belong to the same wager context`,
      );
    }
    if (!reference.money.equals(transaction.money)) {
      throw new ReversalAmountMismatchError(
        `Reference ${reference.id} has a different amount`,
      );
    }
    const reversals = await this.wagerTransactionRepository.findReversalsOf(
      transaction.providerId ?? '',
      reference.externalTransactionId,
    );
    if (reversals.length > 0) {
      throw new ReferenceAlreadyReversedError(
        `Reference ${reference.id} was already reversed`,
      );
    }
    return reference;
  }
}
