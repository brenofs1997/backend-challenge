import type { Wallet } from '../../domain/wallet/wallet';
import type { WalletResponse } from '../../interfaces/http/wallet/dto/wallet.response';

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
