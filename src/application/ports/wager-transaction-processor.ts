import type { Money } from '../../domain/shared/money';
import type { WagerTransactionKind } from '../../domain/wager-transaction/wager-transaction-kind';

export interface ProcessWagerTransactionCommand {
  providerId: string;
  externalTransactionId: string;
  idempotencyKey: string;
  playerId: string;
  walletId: string;
  roundId: string;
  gameId: string;
  kind: WagerTransactionKind;
  money: Money;
  referenceExternalTransactionId?: string;
  payloadHash: string;
}

export interface WagerTransactionProcessor {
  execute(command: ProcessWagerTransactionCommand): Promise<unknown>;
}
