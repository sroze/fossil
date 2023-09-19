export type AnySQSTargetEvent =
  | SQSRelayCreated
  | SQSQueueRequestedEvent
  | SQSQueueCreated
  | SqsRelayDeletedEvent;

export type SQSRelayCreated = {
  type: 'SQSRelayCreated';
  data: {
    subscription_id: string;
  };
};

export type SQSQueueRequestedEvent = {
  type: 'SQSQueueRequested';
  data: object;
};

export type SQSQueueCreated = {
  type: 'SQSQueueCreated';
  data: {
    sqs_queue_url: string;
  };
};

export type SqsRelayDeletedEvent = {
  type: 'SqsRelayDeleted';
  data: object;
};
