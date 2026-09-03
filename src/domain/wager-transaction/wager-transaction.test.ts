import { expect, test, describe } from 'bun:test';
import { WagerTransactionKind } from '../wager-transaction/wager-transaction-kind';
import { WagerTransactionStatus } from '../wager-transaction/wager-transaction-status';
import { Money } from '../shared/money';
import { WagerTransaction } from './wager-transaction';
import { LedgerDirection } from '../wallet/ledger-direction';
import { InvalidTransactionStateError } from '../errors';
import { FailureCode } from './failure-code';

describe('WagerTransaction & Policy', () => {
  const baseProps = {
    id: 'tx-1',
    providerId: 'prov-1',
    externalTransactionId: 'ext-tx-1',
    idempotencyKey: 'idem-1',
    payloadHash: 'hash-1',
    walletId: 'w-1',
    playerId: 'p-1',
    roundId: 'r-1',
    gameId: 'g-1',
    money: Money.from({ amount: '100.00', currency: 'BRL' }),
  };

  describe('Creation Validation', () => {
    test('starts with PENDING status', () => {
      const tx = WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Bet });
      expect(tx.status).toBe(WagerTransactionStatus.Pending);
    });

    test('rejects OPENING from external provider', () => {
      expect(() => {
        WagerTransaction.create({ ...baseProps, providerId: 'EXTERNAL_API', kind: WagerTransactionKind.Opening });
      }).toThrow('OPENING is an internal transaction');
    });

    test('requires referenceExternalTransactionId for REFUND', () => {
      expect(() => {
        WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Refund });
      }).toThrow('REFUND requires a reference external transaction ID');
    });
  });

  describe('Domain Queries & Policies', () => {
    test('matchesPayload accurately identifies idempotency conflicts', () => {
      const tx = WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Bet });
      
      expect(tx.matchesPayload('hash-1')).toBe(true); 
      expect(tx.matchesPayload('different-hash')).toBe(false); 
    });

    test('ledgerDirectionFor evaluates ROLLBACK correctly based on reference', () => {
      const betTx = WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Bet }); 
      const rollbackTx = WagerTransaction.create({ 
        ...baseProps, 
        kind: WagerTransactionKind.Rollback,
        referenceExternalTransactionId: 'ext-bet-1' 
      });

      expect(rollbackTx.ledgerDirectionFor(betTx)).toBe(LedgerDirection.Credit);
    });
  });

  describe('WagerTransaction state machine', () => {
  test('PENDING -> PROCESSED', () => {
      const tx = WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Bet });
    tx.markProcessed(undefined, new Date());
    expect(tx.status).toBe(WagerTransactionStatus.Processed);
    expect(tx.isTerminal()).toBe(true);
  });

  test('PENDING -> PENDING_REFERENCE -> PROCESSED', () => {
    const tx = WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Bet });
    tx.markPendingReference();
    expect(tx.status).toBe(WagerTransactionStatus.PendingReference);
    tx.markProcessed('ref-tx-1', new Date());
    expect(tx.status).toBe(WagerTransactionStatus.Processed);
  });

  test('PENDING -> REJECTED carries a failureCode', () => {
    const tx = WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Bet });
    tx.reject(FailureCode.InsufficientFunds);
    expect(tx.status).toBe(WagerTransactionStatus.Rejected);
    expect(tx.failureCode).toBe(FailureCode.InsufficientFunds);
  });

  test('PENDING -> FAILED carries a failureCode', () => {
    const tx = WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Bet });
    tx.fail(FailureCode.InvalidPayload);
    expect(tx.status).toBe(WagerTransactionStatus.Failed);
  });

  test('transitioning a terminal transaction throws InvalidTransactionStateError', () => {
    const tx = WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Bet });
    tx.markProcessed(undefined, new Date());
    expect(() => tx.markProcessed(undefined, new Date())).toThrow(InvalidTransactionStateError);
    expect(() => tx.reject(FailureCode.InsufficientFunds)).toThrow(InvalidTransactionStateError);
    expect(() => tx.fail(FailureCode.InvalidPayload)).toThrow(InvalidTransactionStateError);
    expect(() => tx.markPendingReference()).toThrow(InvalidTransactionStateError);
  });

  test('REJECTED is terminal — cannot be re-processed', () => {
    const tx = WagerTransaction.create({ ...baseProps, kind: WagerTransactionKind.Bet });
    tx.reject(FailureCode.InsufficientFunds);
    expect(() => tx.markProcessed(undefined, new Date())).toThrow(InvalidTransactionStateError);
  });
});
});