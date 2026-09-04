export interface InboxMessage {
  consumerName: string;
  messageId: string;
  status: 'processing' | 'processed';
  processedAt: Date;
}

export interface InboxRepository {
  find(consumerName: string, messageId: string): Promise<InboxMessage | null>;
  claim(consumerName: string, messageId: string, claimedAt: Date): Promise<boolean>;
  markProcessed(consumerName: string, messageId: string, processedAt: Date): Promise<void>;
  release(consumerName: string, messageId: string): Promise<void>;
}