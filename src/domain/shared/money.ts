import { Decimal } from 'decimal.js';

export interface MoneyProps {
  amount: string;
  currency: string;
}

export class InvalidMoneyError extends Error {}
export class CurrencyMismatchError extends Error {}

const SCALE = 2;
const DECIMAL_STRING = /^-?\d+(\.\d{1,2})?$/;

export class Money {
  private constructor(
    private readonly value: Decimal,
    public readonly currency: string,
  ) {}

  static from(props: MoneyProps): Money {
    Money.assertValidCurrency(props.currency);
    Money.assertValidAmountContract(props.amount);
    return new Money(new Decimal(props.amount), props.currency);
  }

  static zero(currency: string): Money {
    Money.assertValidCurrency(currency);
    return new Money(new Decimal(0), currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.plus(other.value), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.minus(other.value), this.currency);
  }

  negate(): Money {
    return new Money(this.value.negated(), this.currency);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.greaterThan(0);
  }

  isNegative(): boolean {
    return this.value.lessThan(0);
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.value.lessThan(other.value);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.value.equals(other.value);
  }

  toJSON(): MoneyProps {
    return { amount: this.value.toFixed(SCALE), currency: this.currency };
  }

  toString(): string {
    return `${this.value.toFixed(SCALE)} ${this.currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(
        `Cannot operate on Money with different currencies: ${this.currency} vs ${other.currency}`,
      );
    }
  }

  private static assertValidCurrency(currency: string): void {
    if (!currency || !/^[A-Z]{3}$/.test(currency)) {
      throw new InvalidMoneyError(`Invalid currency code: "${currency}"`);
    }
  }

  private static assertValidAmountContract(amount: string): void {
    if (typeof amount !== 'string' || amount.trim().length === 0) {
      throw new InvalidMoneyError('Amount must be a non-empty decimal string');
    }
    if (!DECIMAL_STRING.test(amount)) {
      throw new InvalidMoneyError(
        `Amount "${amount}" is not a valid plain decimal string with up to 2 decimal places`,
      );
    }
    if (amount.startsWith('-')) {
      throw new InvalidMoneyError('Negative amounts are not allowed in input contracts');
    }
  }
}
