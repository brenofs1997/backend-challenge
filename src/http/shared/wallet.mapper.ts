import type { Wallet } from '../../domain/wallet/';
import type { WalletResponse } from '../wallet/dto/wallet.response';

export function toWalletResponse(wallet: Wallet): WalletResponse {
  return {
    id: wallet.id,
    playerId: wallet.playerId,
    currency: wallet.currency,
    balance: wallet.balance.toString(),
    version: wallet.version,
    createdAt: wallet.createdAt.toISOString(),
  };
}
