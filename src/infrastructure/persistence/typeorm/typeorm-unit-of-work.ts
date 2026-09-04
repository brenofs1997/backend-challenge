import { AppDataSource } from './data-source';
import { TransactionContext } from '../typeorm/transaction-context';
import type { UnitOfWork } from '../../../application/ports/unit-of-work';

export class TypeOrmUnitOfWork implements UnitOfWork {
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const result = await TransactionContext.run(queryRunner, work);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
