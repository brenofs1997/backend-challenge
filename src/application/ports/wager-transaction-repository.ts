import type { WagerTransaction } from '../../domain/wager-transaction/wager-transaction';
import type { WagerTransactionKind } from '../../domain/wager-transaction/wager-transaction-kind';

export interface WagerTransactionRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<WagerTransaction | null>;
  findByExternalReference(providerId: string, externalTransactionId: string): Promise<WagerTransaction | null>;
  findLatestProcessedByRound(walletId: string, roundId: string, kind: WagerTransactionKind): Promise<WagerTransaction | null>;
  findReversalsOf(providerId: string, referenceExternalTransactionId: string): Promise<WagerTransaction[]>;
  save(transaction: WagerTransaction): Promise<void>;
}