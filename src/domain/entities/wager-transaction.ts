    
import { FailureCode } from '../wager-transaction/failure-code';
import { Money } from '../shared/money';
import { WagerTransactionKind } from '../wager-transaction/wager-transaction-kind';
import { WagerTransactionStatus } from '../wager-transaction/wager-transaction-status';

export class WagerTransaction {
  private constructor(
    public readonly id: string,
    public readonly idempotencyKey: string,
    public readonly walletId: string,
    public readonly kind: WagerTransactionKind,
    public readonly amount: Money,
    public status: WagerTransactionStatus,
    public readonly referenceId?: string,
    public readonly failureCode?: FailureCode,
  ) {}

  public static create(params: {
    id: string;
    idempotencyKey: string;
    walletId: string;
    kind: WagerTransactionKind;
    amount: Money;
    referenceId?: string;
  }): WagerTransaction {
    if ((params.kind === WagerTransactionKind.Refund || params.kind === WagerTransactionKind.Rollback) && !params.referenceId) {
      throw new Error(FailureCode.InvalidPayload);
    }

    return new WagerTransaction(
      params.id,
      params.idempotencyKey,
      params.walletId,
      params.kind,
      params.amount,
      WagerTransactionStatus.PendingReference,
      params.referenceId,
    );
  }

  public markProcessed(): void {
    this.ensureNotTerminal();
    this.status = WagerTransactionStatus.Processed;
  }

  public reject(code: FailureCode): void {
    this.ensureNotTerminal();
    this.status = WagerTransactionStatus.Rejected;
  }

  private ensureNotTerminal(): void {
    if (this.status === WagerTransactionStatus.Processed || this.status === WagerTransactionStatus.Rejected || this.status === WagerTransactionStatus.Failed) {
      throw new Error(FailureCode.InvalidPayload);
    }
  }
}