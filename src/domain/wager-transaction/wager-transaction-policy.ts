import { WagerTransactionKind } from './wager-transaction-kind';
import { LedgerDirection } from '../wallet/ledger-direction'; 

export class WagerTransactionPolicy {
  public static affectsBalance(kind: WagerTransactionKind): boolean {
    return kind !== WagerTransactionKind.Loss;
  }

  public static requiresReference(kind: WagerTransactionKind): boolean {
    return kind === WagerTransactionKind.Refund || kind === WagerTransactionKind.Rollback;
  }

  public static ledgerDirectionFor(kind: WagerTransactionKind, referenceDirection?: LedgerDirection): LedgerDirection {
    switch (kind) {
      case WagerTransactionKind.Bet:
        return LedgerDirection.Debit;
      case WagerTransactionKind.Win:
      case WagerTransactionKind.Opening:
      case WagerTransactionKind.Refund: 
        return LedgerDirection.Credit;
      case WagerTransactionKind.Rollback:
        if (!referenceDirection) {
          throw new Error('ROLLBACK requires a resolved reference direction to evaluate');
        }
        return referenceDirection === LedgerDirection.Credit ? LedgerDirection.Debit : LedgerDirection.Credit;
      case WagerTransactionKind.Loss:
      default:
        throw new Error(`Ledger direction not applicable for ${kind}`);
    }
  }
}