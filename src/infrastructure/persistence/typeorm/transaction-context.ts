import { AsyncLocalStorage } from 'node:async_hooks';
import type { QueryRunner } from 'typeorm';

const storage = new AsyncLocalStorage<QueryRunner>();

export const TransactionContext = {
  run<T>(queryRunner: QueryRunner, fn: () => Promise<T>): Promise<T> {
    return storage.run(queryRunner, fn);
  },
  current(): QueryRunner | undefined {
    return storage.getStore();
  },
};