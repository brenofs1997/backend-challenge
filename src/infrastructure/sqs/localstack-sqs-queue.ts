import {
  ChangeMessageVisibilityCommand,
  CreateQueueCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import type {
  MessageQueue,
  QueueMessage,
} from '../../application/ports/message-queue';

export interface LocalStackSqsQueueOptions {
  endpoint?: string;
  region?: string;
  queueName?: string;
  deadLetterQueueName?: string;
  maxReceiveCount?: number;
}

export class LocalStackSqsQueue implements MessageQueue {
  private readonly client: SQSClient;
  private readonly queueName: string;
  private readonly deadLetterQueueName: string;
  private readonly maxReceiveCount: number;
  private queueUrl?: string;
  private deadLetterQueueUrl?: string;
  private readonly bodies = new Map<string, string>();

  constructor(options: LocalStackSqsQueueOptions = {}) {
    this.client = new SQSClient({
      endpoint:
        options.endpoint ?? process.env.AWS_ENDPOINT ?? 'http://localhost:4566',
      region: options.region ?? process.env.AWS_REGION ?? 'us-east-1',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    });
    this.queueName = options.queueName ?? 'wager-transactions.fifo';
    this.deadLetterQueueName =
      options.deadLetterQueueName ?? 'wager-transactions-dlq.fifo';
    this.maxReceiveCount = options.maxReceiveCount ?? 3;
  }

  async ensureQueues(): Promise<void> {
    await this.createQueue(this.deadLetterQueueName, {
      FifoQueue: 'true',
      ContentBasedDeduplication: 'false',
    });
    this.deadLetterQueueUrl = await this.getQueueUrl(this.deadLetterQueueName);
    const deadLetterQueueArn = await this.getQueueArn(this.deadLetterQueueUrl);
    this.queueUrl = await this.createQueue(this.queueName, {
      FifoQueue: 'true',
      ContentBasedDeduplication: 'false',
      RedrivePolicy: JSON.stringify({
        deadLetterTargetArn: deadLetterQueueArn,
        maxReceiveCount: String(this.maxReceiveCount),
      }),
    });
  }

  async receive(signal?: AbortSignal): Promise<QueueMessage[]> {
    const queueUrl = await this.requireQueueUrl();
    const result = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 30,
        AttributeNames: ['ApproximateReceiveCount'],
      }),
      { abortSignal: signal },
    );

    return (result.Messages ?? []).flatMap((message) => {
      if (!message.ReceiptHandle || message.Body === undefined) return [];
      this.bodies.set(message.ReceiptHandle, message.Body);
      return [
        {
          receiptHandle: message.ReceiptHandle,
          body: message.Body,
          receiveCount: Number(
            message.Attributes?.ApproximateReceiveCount ?? 1,
          ),
        },
      ];
    });
  }

  async acknowledge(receiptHandle: string): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: await this.requireQueueUrl(),
        ReceiptHandle: receiptHandle,
      }),
    );
    this.bodies.delete(receiptHandle);
  }

  async changeVisibility(
    receiptHandle: string,
    timeoutSeconds: number,
  ): Promise<void> {
    await this.client.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: await this.requireQueueUrl(),
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: timeoutSeconds,
      }),
    );
  }

  async moveToDeadLetterQueue(receiptHandle: string): Promise<void> {
    const body = this.bodies.get(receiptHandle);
    if (body === undefined)
      throw new Error('Message body is unavailable for DLQ transfer');
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: await this.requireDeadLetterQueueUrl(),
        MessageBody: body,
        MessageGroupId: 'wager-transactions',
        MessageDeduplicationId: `dlq-${receiptHandle}`,
      }),
    );
    await this.acknowledge(receiptHandle);
  }

  async send(
    body: string,
    messageGroupId: string,
    messageDeduplicationId: string,
  ): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: await this.requireQueueUrl(),
        MessageBody: body,
        MessageGroupId: messageGroupId,
        MessageDeduplicationId: messageDeduplicationId,
      }),
    );
  }

  private async createQueue(
    name: string,
    attributes?: Record<string, string>,
  ): Promise<string> {
    const result = await this.client.send(
      new CreateQueueCommand({ QueueName: name, Attributes: attributes }),
    );
    if (!result.QueueUrl)
      throw new Error(`SQS did not return a URL for ${name}`);
    return result.QueueUrl;
  }

  private async getQueueUrl(name: string): Promise<string> {
    const result = await this.client.send(
      new GetQueueUrlCommand({ QueueName: name }),
    );
    if (!result.QueueUrl)
      throw new Error(`SQS did not return a URL for ${name}`);
    return result.QueueUrl;
  }

  private async getQueueArn(queueUrl: string): Promise<string> {
    const result = await this.client.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['QueueArn'],
      }),
    );
    const queueArn = result.Attributes?.QueueArn;
    if (!queueArn) throw new Error('SQS did not return the queue ARN');
    return queueArn;
  }

  private async requireQueueUrl(): Promise<string> {
    if (!this.queueUrl) await this.ensureQueues();
    return this.queueUrl as string;
  }

  private async requireDeadLetterQueueUrl(): Promise<string> {
    if (!this.deadLetterQueueUrl) await this.ensureQueues();
    return this.deadLetterQueueUrl as string;
  }
}
