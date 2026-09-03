import { InsufficientBalanceError, WalletCurrencyMismatchError } from '../errors';
import { LedgerDirection } from './ledger-direction';
import { WalletLedgerEntry } from './wallet-ledger-entry';
import { Money } from '../shared/money';

export interface OpenWalletProps {
  id: string;
  playerId: string;
  initialBalance: Money;
  createdAt: Date;
}

export interface WalletState {
  id: string;
  playerId: string;
  currency: string;
  balance: Money;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordWalletMovementProps {
  ledgerEntryId: string;
  transactionId: string;
  money: Money;
  at: Date;
}

export class Wallet {
  private constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly currency: string,
    private _balance: Money,
    private _version: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static open(props: OpenWalletProps): Wallet {
    return new Wallet(
      props.id,
      props.playerId,
      props.initialBalance.currency,
      props.initialBalance,
      1,
      props.createdAt,
      props.createdAt,
    );
  }


  static rehydrate(state: WalletState): Wallet {
    return new Wallet(
      state.id,
      state.playerId,
      state.currency,
      state.balance,
      state.version,
      state.createdAt,
      state.updatedAt,
    );
  }

  get balance(): Money {
    return this._balance;
  }

  get version(): number {
    return this._version;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

 
  debit(props: RecordWalletMovementProps): WalletLedgerEntry {
    this.assertSameCurrency(props.money);
    if (this._balance.isLessThan(props.money)) {
      throw new InsufficientBalanceError(
        `Wallet ${this.id} has insufficient balance: has ${this._balance.toString()}, needs ${props.money.toString()}`,
      );
    }
    return this.recordMovement(LedgerDirection.Debit, props);
  }

 
  credit(props: RecordWalletMovementProps): WalletLedgerEntry {
    this.assertSameCurrency(props.money);
    return this.recordMovement(LedgerDirection.Credit, props);
  }

  private recordMovement(direction: LedgerDirection, props: RecordWalletMovementProps): WalletLedgerEntry {
    const balanceBefore = this._balance;
    const balanceAfter =
      direction === LedgerDirection.Debit
        ? balanceBefore.subtract(props.money)
        : balanceBefore.add(props.money);

    const entry = WalletLedgerEntry.create({
      id: props.ledgerEntryId,
      walletId: this.id,
      transactionId: props.transactionId,
      direction,
      money: props.money,
      balanceBefore,
      balanceAfter,
      createdAt: props.at,
    });

    this._balance = balanceAfter;
    this._version += 1;
    this._updatedAt = props.at;
    return entry;
  }

  private assertSameCurrency(money: Money): void {
    if (money.currency !== this.currency) {
      throw new WalletCurrencyMismatchError(
        `Wallet ${this.id} operates in ${this.currency}, got ${money.currency}`,
      );
    }
  }
}
