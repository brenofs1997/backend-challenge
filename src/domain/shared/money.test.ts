import { describe, expect, test } from 'bun:test';
import { CurrencyMismatchError, InvalidMoneyError, Money } from './money';

describe('Money', () => {
  test('creates from a valid decimal string', () => {
    const money = Money.from({ amount: '25.00', currency: 'BRL' });
    expect(money.toJSON()).toEqual({ amount: '25.00', currency: 'BRL' });
  });

  test('zero() creates a zero-value amount', () => {
    expect(Money.zero('BRL').isZero()).toBe(true);
  });

  test('rejects NaN', () => {
    expect(() => Money.from({ amount: 'NaN', currency: 'BRL' })).toThrow(InvalidMoneyError);
  });

  test('rejects Infinity', () => {
    expect(() => Money.from({ amount: 'Infinity', currency: 'BRL' })).toThrow(InvalidMoneyError);
  });

  test('rejects scientific notation', () => {
    expect(() => Money.from({ amount: '2.5e3', currency: 'BRL' })).toThrow(InvalidMoneyError);
  });

  test('rejects an empty string', () => {
    expect(() => Money.from({ amount: '', currency: 'BRL' })).toThrow(InvalidMoneyError);
  });

  test('rejects more than 2 decimal places', () => {
    expect(() => Money.from({ amount: '10.123', currency: 'BRL' })).toThrow(InvalidMoneyError);
  });

  test('rejects negative amounts in input contracts', () => {
    expect(() => Money.from({ amount: '-5.00', currency: 'BRL' })).toThrow(InvalidMoneyError);
  });

  test('add sums values of the same currency', () => {
    const a = Money.from({ amount: '10.00', currency: 'BRL' });
    const b = Money.from({ amount: '5.50', currency: 'BRL' });
    expect(a.add(b).toJSON().amount).toBe('15.50');
  });

  test('subtract and negate work correctly', () => {
    const a = Money.from({ amount: '10.00', currency: 'BRL' });
    const b = Money.from({ amount: '3.00', currency: 'BRL' });
    expect(a.subtract(b).toJSON().amount).toBe('7.00');
    expect(b.negate().toJSON().amount).toBe('-3.00');
  });

  test('is immutable — operations return new instances', () => {
    const a = Money.from({ amount: '10.00', currency: 'BRL' });
    const b = a.add(Money.from({ amount: '5.00', currency: 'BRL' }));
    expect(a.toJSON().amount).toBe('10.00');
    expect(b.toJSON().amount).toBe('15.00');
  });

  test('operations across different currencies throw CurrencyMismatchError', () => {
    const brl = Money.from({ amount: '10.00', currency: 'BRL' });
    const usd = Money.from({ amount: '10.00', currency: 'USD' });
    expect(() => brl.add(usd)).toThrow(CurrencyMismatchError);
  });
});
