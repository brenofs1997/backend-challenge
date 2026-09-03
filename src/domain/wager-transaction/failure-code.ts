export enum FailureCode {
  InsufficientFunds = 'INSUFFICIENT_FUNDS', 
  ReversalWouldOverdraw = 'REVERSAL_WOULD_OVERDRAW', 
  ReferenceNotFound = 'REFERENCE_NOT_FOUND', 
  ReferenceMismatch = 'REFERENCE_MISMATCH',   
  ReferenceAlreadyReversed = 'REFERENCE_ALREADY_REVERSED', 
  ReversalAmountMismatch = 'REVERSAL_AMOUNT_MISMATCH', 
  CurrencyMismatch = 'CURRENCY_MISMATCH',
  IdempotencyConflict = 'IDEMPOTENCY_CONFLICT',
  InvalidPayload = 'INVALID_PAYLOAD',
  LedgerEntryNotBalanced = 'LEDGER_ENTRY_NOT_BALANCED',
  InvalidTransactionState = 'INVALID_TRANSACTION_STATE',
}
