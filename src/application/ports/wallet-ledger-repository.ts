import type { WalletLedgerEntry } from '../../domain/wallet/wallet-ledger-entry';

export interface LedgerPageRequest {
  limit: number;
  cursor?: string;
}

export interface LedgerPage {
  entries: WalletLedgerEntry[];
  nextCursor?: string;
}

export interface WalletLedgerRepository {
  
  append(entry: WalletLedgerEntry): Promise<void>;
  findByWalletCursor(walletId: string, page: LedgerPageRequest): Promise<LedgerPage>;
}