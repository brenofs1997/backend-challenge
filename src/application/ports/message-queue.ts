export interface QueueMessage {
  receiptHandle: string;
  body: string;
  receiveCount: number;
}

export interface MessageQueue {
  receive(signal?: AbortSignal): Promise<QueueMessage[]>;
  acknowledge(receiptHandle: string): Promise<void>;
  changeVisibility(receiptHandle: string, timeoutSeconds: number): Promise<void>;
  moveToDeadLetterQueue(receiptHandle: string): Promise<void>;
}