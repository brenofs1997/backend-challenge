import {
  InsufficientBalanceError,
  InvalidTransactionStateError,
  MissingReferenceError,
} from '../../domain/errors';
import {
  IdempotencyConflictError,
  ReferenceAlreadyReversedError,
  ReferenceMismatchError,
  ReversalAmountMismatchError,
  WalletNotFoundError,
} from '../wager-transaction/process-wager-transaction.use-case';
import type {
  MessageFailureClassifier,
  MessageFailureKind,
} from './wager-transaction-consumer';

export class DefaultMessageFailureClassifier
  implements MessageFailureClassifier
{
  classify(error: unknown): MessageFailureKind {
    if (
      error instanceof InsufficientBalanceError ||
      error instanceof InvalidTransactionStateError ||
      error instanceof MissingReferenceError ||
      error instanceof IdempotencyConflictError ||
      error instanceof ReferenceAlreadyReversedError ||
      error instanceof ReferenceMismatchError ||
      error instanceof ReversalAmountMismatchError ||
      error instanceof WalletNotFoundError
    ) {
      return 'business';
    }
    return 'transient';
  }
}
