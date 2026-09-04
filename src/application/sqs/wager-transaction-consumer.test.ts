import { describe, expect, test } from 'bun:test';
import { InMemoryInboxRepository } from '../../infrastructure/in-memory-wallet-dependencies';
import type { MessageQueue, QueueMessage } from '../ports/message-queue';
import type { WagerTransactionProcessor } from '../ports/wager-transaction-processor';
import { DefaultMessageFailureClassifier } from './default-message-failure-classifier';
import { WagerTransactionConsumer } from './wager-transaction-consumer';

const body = JSON.stringify({
  messageId: 'msg-123',
  type: 'WagerTransactionRequested',
  occurredAt: '2026-07-29T15:00:00.000Z',
  data: {
    providerId: 'provider-a',
    externalTransactionId: 'transaction-123',
    idempotencyKey: 'provider-a:transaction-123',
    playerId: 'player-1',
    walletId: 'wallet-1',
    roundId: 'round-987',
    gameId: 'fortune-chimp',
    kind: 'BET',
    money: { amount: '25.00', currency: 'BRL' },
  },
});

class FakeQueue implements MessageQueue {
  readonly calls: string[] = [];

  async receive(): Promise<QueueMessage[]> {
    return [];
  }
  async acknowledge(): Promise<void> {
    this.calls.push('ack');
  }
  async changeVisibility(): Promise<void> {
    this.calls.push('visibility');
  }
  async moveToDeadLetterQueue(): Promise<void> {
    this.calls.push('dlq');
  }
}

class FakeProcessor implements WagerTransactionProcessor {
  executions = 0;
  constructor(private readonly calls: string[]) {}

  async execute(): Promise<void> {
    this.executions += 1;
    this.calls.push('process');
  }
}

function createConsumer(
  queue: FakeQueue,
  processor: FakeProcessor,
): WagerTransactionConsumer {
  return new WagerTransactionConsumer(
    queue,
    new InMemoryInboxRepository(),
    processor,
    new DefaultMessageFailureClassifier(),
  );
}

function message(receiveCount = 1): QueueMessage {
  return { receiptHandle: `receipt-${receiveCount}`, body, receiveCount };
}

describe('WagerTransactionConsumer', () => {
  test('acknowledges only after processing completes', async () => {
    const queue = new FakeQueue();
    const processor = new FakeProcessor(queue.calls);
    const consumer = createConsumer(queue, processor);

    await consumer.processMessage(message());

    expect(processor.executions).toBe(1);
    expect(queue.calls).toEqual(['process', 'ack']);
  });

  test('does not process a redelivered message twice', async () => {
    const queue = new FakeQueue();
    const processor = new FakeProcessor(queue.calls);
    const consumer = createConsumer(queue, processor);

    await consumer.processMessage(message());
    await consumer.processMessage(message(2));

    expect(processor.executions).toBe(1);
    expect(queue.calls).toEqual(['process', 'ack', 'ack']);
  });
});
