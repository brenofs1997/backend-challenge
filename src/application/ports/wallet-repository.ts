import type { Wallet } from '../../domain/wallet/wallet';

export type WalletLockMode = 'PESSIMISTIC_WRITE';

export interface WalletRepository {
  findById(walletId: string, lock?: WalletLockMode): Promise<Wallet | null>;
  findByPlayerAndCurrency(playerId: string, currency: string, lock?: WalletLockMode): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
}