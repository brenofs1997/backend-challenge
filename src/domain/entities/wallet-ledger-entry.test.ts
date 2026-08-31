import { expect, test, describe } from 'bun:test';
import { WalletLedgerEntry } from './wallet-ledger-entry';
import { Money } from '../shared/money';
import { LedgerDirection } from '../wallet/ledger-direction'; 
import { FailureCode } from '../wager-transaction/failure-code';

describe('WalletLedgerEntry', () => {
  test('should create a balanced CREDIT entry', () => {
    const amount = Money.from({ amount: '50.00', currency: 'USD' });
    const balanceBefore = Money.from({ amount: '100.00', currency: 'USD' });
    const balanceAfter = Money.from({ amount: '150.00', currency: 'USD' });

    const entry = WalletLedgerEntry.create({
      id: 'entry-1',
      walletId: 'wallet-1',
      amount,
      direction: LedgerDirection.Credit,
      balanceBefore,
      balanceAfter,
      transactionId: 'tx-1',
    });

    expect(entry.isBalanced()).toBe(true);
  });

  test('should reject an unbalanced entry', () => {
    const amount = Money.from({ amount: '50.00', currency: 'USD' });
    const balanceBefore = Money.from({ amount: '100.00', currency: 'USD' });
    const balanceAfter = Money.from({ amount: '999.00', currency: 'USD' }); 

    expect(() => {
      WalletLedgerEntry.create({
        id: 'entry-2',
        walletId: 'wallet-1',
        amount,
        direction: LedgerDirection.Credit,
        balanceBefore,
        balanceAfter,
        transactionId: 'tx-2',
      });
    }).toThrow(FailureCode.LedgerEntryNotBalanced);
  });
});