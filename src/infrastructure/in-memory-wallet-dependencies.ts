import type { Clock } from '../application/ports/clock';
import type {
  InboxMessage,
  InboxRepository,
} from '../application/ports/inbox-repository';
import type { IdGenerator } from '../application/ports/id-generator';
import type { UnitOfWork } from '../application/ports/unit-of-work';
import type {
  WalletLedgerRepository,
  LedgerPage,
  LedgerPageRequest,
} from '../application/ports/wallet-ledger-repository';
import type {
  WalletRepository,
  WalletLockMode,
} from '../application/ports/wallet-repository';
import type { WagerTransactionRepository } from '../application/ports/wager-transaction-repository';
import type { Wallet } from '../domain/wallet/wallet';
import type { WalletLedgerEntry } from '../domain/wallet/wallet-ledger-entry';
import type { WagerTransaction } from '../domain/wager-transaction/wager-transaction';
import type { WagerTransactionKind } from '../domain/wager-transaction/wager-transaction-kind';

export class InMemoryClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class InMemoryIdGenerator implements IdGenerator {
  private sequence = 0;

  next(): string {
    return this.newId();
  }

  newId(): string {
    this.sequence += 1;
    return `id-${this.sequence}`;
  }
}

export class InMemoryUnitOfWork implements UnitOfWork {
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}

export class InMemoryInboxRepository implements InboxRepository {
  private readonly messages = new Map<string, InboxMessage>();

  async find(
    consumerName: string,
    messageId: string,
  ): Promise<InboxMessage | null> {
    return this.messages.get(`${consumerName}:${messageId}`) ?? null;
  }

  async claim(
    consumerName: string,
    messageId: string,
    processedAt: Date,
  ): Promise<boolean> {
    const key = `${consumerName}:${messageId}`;
    if (this.messages.has(key)) return false;
    this.messages.set(key, {
      consumerName,
      messageId,
      status: 'processing',
      processedAt,
    });
    return true;
  }

  async markProcessed(
    consumerName: string,
    messageId: string,
    processedAt: Date,
  ): Promise<void> {
    const key = `${consumerName}:${messageId}`;
    const message = this.messages.get(key);
    if (!message) throw new Error('Inbox message was not claimed');
    this.messages.set(key, { ...message, status: 'processed', processedAt });
  }

  async release(consumerName: string, messageId: string): Promise<void> {
    this.messages.delete(`${consumerName}:${messageId}`);
  }
}

export class InMemoryWalletRepository implements WalletRepository {
  private readonly wallets = new Map<string, Wallet>();

  async findById(
    walletId: string,
    _lock?: WalletLockMode,
  ): Promise<Wallet | null> {
    return this.wallets.get(walletId) ?? null;
  }

  async findByPlayerAndCurrency(
    playerId: string,
    currency: string,
    _lock?: WalletLockMode,
  ): Promise<Wallet | null> {
    return (
      [...this.wallets.values()].find(
        (wallet) =>
          wallet.playerId === playerId && wallet.currency === currency,
      ) ?? null
    );
  }

  async save(wallet: Wallet): Promise<void> {
    this.wallets.set(wallet.id, wallet);
  }
}

export class InMemoryWagerTransactionRepository
  implements WagerTransactionRepository
{
  private readonly transactions = new Map<string, WagerTransaction>();

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<WagerTransaction | null> {
    return (
      [...this.transactions.values()].find(
        (transaction) => transaction.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async findByExternalReference(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | null> {
    return (
      [...this.transactions.values()].find(
        (transaction) =>
          transaction.providerId === providerId &&
          transaction.externalTransactionId === externalTransactionId,
      ) ?? null
    );
  }

  async findLatestProcessedByRound(
    walletId: string,
    roundId: string,
    kind: WagerTransactionKind,
  ): Promise<WagerTransaction | null> {
    return (
      [...this.transactions.values()]
        .reverse()
        .find(
          (transaction) =>
            transaction.walletId === walletId &&
            transaction.roundId === roundId &&
            transaction.kind === kind &&
            transaction.isTerminal(),
        ) ?? null
    );
  }

  async findReversalsOf(
    _providerId: string,
    _referenceExternalTransactionId: string,
  ): Promise<WagerTransaction[]> {
    return [];
  }

  async save(transaction: WagerTransaction): Promise<void> {
    this.transactions.set(transaction.id, transaction);
  }
}

export class InMemoryWalletLedgerRepository implements WalletLedgerRepository {
  private readonly entries: WalletLedgerEntry[] = [];

  async append(entry: WalletLedgerEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findByWalletCursor(
    walletId: string,
    page: LedgerPageRequest,
  ): Promise<LedgerPage> {
    const entries = this.entries.filter((entry) => entry.walletId === walletId);
    return { entries: entries.slice(0, page.limit) };
  }
}
