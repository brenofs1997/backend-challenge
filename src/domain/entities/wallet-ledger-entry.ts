import { Money } from '../shared/money';
import { LedgerDirection } from '../wallet/ledger-direction'; 
import { FailureCode } from '../wager-transaction/failure-code';

export class WalletLedgerEntry {
  private constructor(
    public readonly id: string,
    public readonly walletId: string,
    public readonly amount: Money,
    public readonly direction: LedgerDirection,
    public readonly balanceBefore: Money,
    public readonly balanceAfter: Money,
    public readonly transactionId: string,
    public readonly createdAt: Date,
  ) {}

  public static create(params: {
    id: string;
    walletId: string;
    amount: Money;
    direction: LedgerDirection;
    balanceBefore: Money;
    balanceAfter: Money;
    transactionId: string;
    createdAt?: Date;
  }): WalletLedgerEntry {
    const entry = new WalletLedgerEntry(
      params.id,
      params.walletId,
      params.amount,
      params.direction,
      params.balanceBefore,
      params.balanceAfter,
      params.transactionId,
      params.createdAt ?? new Date(),
    );

    if (!entry.isBalanced()) {
      throw new Error(FailureCode.LedgerEntryNotBalanced);
    }

    return entry;
  }

  public isBalanced(): boolean {
    if (this.direction === LedgerDirection.Credit) {
      return this.balanceBefore.add(this.amount).equals(this.balanceAfter);
    }
    return this.balanceBefore.subtract(this.amount).equals(this.balanceAfter);
  }
}