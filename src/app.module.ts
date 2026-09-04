import { Module } from '@nestjs/common';
import { DefaultMessageFailureClassifier } from './application/sqs/default-message-failure-classifier';
import { WagerTransactionConsumer } from './application/sqs/wager-transaction-consumer';
import { ProcessWagerTransactionUseCase } from './application/wager-transaction/process-wager-transaction.use-case';
import { CreateWalletUseCase } from './application/wallet/create-wallet.use-case';
import { HealthController } from './interfaces/http/health/health.controller';
import { WalletController } from './interfaces/http/wallet/wallet.controller';
import { WagerController } from './interfaces/http/wager/wager.controller';
import {
  InMemoryClock,
  InMemoryIdGenerator,
  InMemoryInboxRepository,
  InMemoryUnitOfWork,
  InMemoryWalletLedgerRepository,
  InMemoryWalletRepository,
  InMemoryWagerTransactionRepository,
} from './infrastructure/in-memory-wallet-dependencies';
import { LocalStackSqsQueue } from './infrastructure/sqs/localstack-sqs-queue';
import { WagerTransactionWorker } from './infrastructure/sqs/wager-transaction-worker';

@Module({
  controllers: [HealthController, WalletController, WagerController],
  providers: [
    InMemoryClock,
    InMemoryIdGenerator,
    InMemoryInboxRepository,
    InMemoryWalletLedgerRepository,
    InMemoryWalletRepository,
    InMemoryWagerTransactionRepository,
    LocalStackSqsQueue,
    DefaultMessageFailureClassifier,
    {
      provide: ProcessWagerTransactionUseCase,
      useFactory: (
        walletRepository: InMemoryWalletRepository,
        wagerTransactionRepository: InMemoryWagerTransactionRepository,
        walletLedgerRepository: InMemoryWalletLedgerRepository,
        clock: InMemoryClock,
        idGenerator: InMemoryIdGenerator,
      ) =>
        new ProcessWagerTransactionUseCase(
          walletRepository,
          wagerTransactionRepository,
          walletLedgerRepository,
          new InMemoryUnitOfWork(),
          clock,
          idGenerator,
        ),
      inject: [
        InMemoryWalletRepository,
        InMemoryWagerTransactionRepository,
        InMemoryWalletLedgerRepository,
        InMemoryClock,
        InMemoryIdGenerator,
      ],
    },
    {
      provide: CreateWalletUseCase,
      useFactory: (
        walletRepository: InMemoryWalletRepository,
        wagerTransactionRepository: InMemoryWagerTransactionRepository,
        walletLedgerRepository: InMemoryWalletLedgerRepository,
        clock: InMemoryClock,
        idGenerator: InMemoryIdGenerator,
      ) =>
        new CreateWalletUseCase(
          walletRepository,
          wagerTransactionRepository,
          walletLedgerRepository,
          new InMemoryUnitOfWork(),
          clock,
          idGenerator,
        ),
      inject: [
        InMemoryWalletRepository,
        InMemoryWagerTransactionRepository,
        InMemoryWalletLedgerRepository,
        InMemoryClock,
        InMemoryIdGenerator,
      ],
    },
    {
      provide: WagerTransactionConsumer,
      useFactory: (
        queue: LocalStackSqsQueue,
        inbox: InMemoryInboxRepository,
        processor: ProcessWagerTransactionUseCase,
        failureClassifier: DefaultMessageFailureClassifier,
      ) =>
        new WagerTransactionConsumer(
          queue,
          inbox,
          processor,
          failureClassifier,
        ),
      inject: [
        LocalStackSqsQueue,
        InMemoryInboxRepository,
        ProcessWagerTransactionUseCase,
        DefaultMessageFailureClassifier,
      ],
    },
    WagerTransactionWorker,
  ],
})
export class AppModule {}
