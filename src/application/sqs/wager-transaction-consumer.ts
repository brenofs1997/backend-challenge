import { Money } from '../../domain/shared/money';
import type { InboxRepository } from '../ports/inbox-repository';
import type { MessageQueue, QueueMessage } from '../ports/message-queue';
import type { WagerTransactionProcessor } from '../ports/wager-transaction-processor';
import type { WagerTransactionRequestedMessage } from './wager-transaction-message';

export type MessageFailureKind = 'business' | 'transient' | 'permanent';

export interface MessageFailureClassifier {
  classify(error: unknown): MessageFailureKind;
}

export class WagerTransactionConsumer {
  private stopping = false;
  private readonly inFlight = new Set<Promise<void>>();

  constructor(
    private readonly queue: MessageQueue,
    private readonly inbox: InboxRepository,
    private readonly processor: WagerTransactionProcessor,
    private readonly failureClassifier: MessageFailureClassifier,
    private readonly consumerName = 'wager-transactions',
    private readonly maxAttempts = 3,
  ) {}

  async poll(signal?: AbortSignal): Promise<void> {
    while (!this.stopping && !signal?.aborted) {
      const messages = await this.queue.receive(signal);
      for (const message of messages) {
        const task = this.processMessage(message).finally(() =>
          this.inFlight.delete(task),
        );
        this.inFlight.add(task);
      }
    }
  }

  async stop(): Promise<void> {
    this.stopping = true;
    await Promise.all(this.inFlight);
  }

  async processMessage(message: QueueMessage): Promise<void> {
    let event: WagerTransactionRequestedMessage;
    try {
      event = this.parse(message.body);
    } catch {
      await this.queue.moveToDeadLetterQueue(message.receiptHandle);
      return;
    }

    const existing = await this.inbox.find(this.consumerName, event.messageId);
    if (existing?.status === 'processed') {
      await this.queue.acknowledge(message.receiptHandle);
      return;
    }

    if (
      !(await this.inbox.claim(this.consumerName, event.messageId, new Date()))
    ) {
      await this.queue.changeVisibility(message.receiptHandle, 1);
      return;
    }

    try {
      await this.processor.execute({
        ...event.data,
        money: Money.from(event.data.money),
        payloadHash: JSON.stringify(event.data),
      });

     
      await this.inbox.markProcessed(
        this.consumerName,
        event.messageId,
        new Date(),
      );
      await this.queue.acknowledge(message.receiptHandle);
    } catch (error) {
      const failure = this.failureClassifier.classify(error);
      if (failure === 'business') {
        await this.inbox.markProcessed(
          this.consumerName,
          event.messageId,
          new Date(),
        );
        await this.queue.acknowledge(message.receiptHandle);
      } else if (failure === 'permanent') {
        await this.inbox.release(this.consumerName, event.messageId);
        await this.queue.moveToDeadLetterQueue(message.receiptHandle);
      } else if (message.receiveCount >= this.maxAttempts) {
        await this.inbox.release(this.consumerName, event.messageId);
        await this.queue.moveToDeadLetterQueue(message.receiptHandle);
      } else {
        await this.inbox.release(this.consumerName, event.messageId);
        await this.queue.changeVisibility(
          message.receiptHandle,
          this.backoff(message),
        );
      }
    }
  }

  private parse(body: string): WagerTransactionRequestedMessage {
    const event: unknown = JSON.parse(body);
    if (!this.isMessage(event)) {
      throw new Error('Invalid WagerTransactionRequested message');
    }
    return event;
  }

  private isMessage(value: unknown): value is WagerTransactionRequestedMessage {
    if (!value || typeof value !== 'object') return false;
    const event = value as Partial<WagerTransactionRequestedMessage>;
    return (
      event.type === 'WagerTransactionRequested' &&
      typeof event.messageId === 'string' &&
      typeof event.data === 'object' &&
      event.data !== null
    );
  }

  private backoff(message: QueueMessage): number {
    return Math.min(30, 2 ** Math.max(0, message.receiveCount - 1));
  }
}
