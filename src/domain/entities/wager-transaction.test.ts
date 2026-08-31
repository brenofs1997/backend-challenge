import { expect, test, describe } from 'bun:test';
import { WagerTransactionKind } from '../wager-transaction/wager-transaction-kind';
import { WagerTransactionStatus } from '../wager-transaction/wager-transaction-status';
import { FailureCode } from '../wager-transaction/failure-code';
import { Money } from '../shared/money';
import { WagerTransaction } from './wager-transaction';

describe('WagerTransaction', () => {
  const defaultAmount = Money.from({ amount: '100.00', currency: 'BRL' });

  test('should require reference for REFUND', () => {
    expect(() => {
      WagerTransaction.create({
        id: 'tx-1',
        idempotencyKey: 'idem-1',
        walletId: 'w-1',
        kind: WagerTransactionKind.Refund,
        amount: defaultAmount,
      });
    }).toThrow(FailureCode.InvalidPayload);
  });

  test('should transition to PROCESSED successfully', () => {
    const tx = WagerTransaction.create({
      id: 'tx-2',
      idempotencyKey: 'idem-2',
      walletId: 'w-1',
      kind: WagerTransactionKind.Bet,
      amount: defaultAmount,
    });

    tx.markProcessed();
    expect(tx.status).toBe(WagerTransactionStatus.Processed);
  });

  test('should block state transition from a terminal state', () => {
    const tx = WagerTransaction.create({
      id: 'tx-3',
      idempotencyKey: 'idem-3',
      walletId: 'w-1',
      kind: WagerTransactionKind.Bet,
      amount: defaultAmount,
    });

    tx.markProcessed();

    expect(() => {
      tx.markProcessed();
    }).toThrow(FailureCode.InvalidPayload);
  });
});