import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { WagerTransactionConsumer } from '../../application/sqs/wager-transaction-consumer';
import { LocalStackSqsQueue } from './localstack-sqs-queue';

@Injectable()
export class WagerTransactionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WagerTransactionWorker.name);
  private readonly abortController = new AbortController();
  private pollPromise?: Promise<void>;

  constructor(
    private readonly queue: LocalStackSqsQueue,
    private readonly consumer: WagerTransactionConsumer,
  ) {}

  onModuleInit(): void {
    this.pollPromise = this.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.abortController.abort();
    await this.consumer.stop();
    await this.pollPromise;
  }

  private async start(): Promise<void> {
    try {
      await this.queue.ensureQueues();
      await this.consumer.poll(this.abortController.signal);
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        this.logger.error('SQS worker stopped unexpectedly', error);
      }
    }
  }
}
