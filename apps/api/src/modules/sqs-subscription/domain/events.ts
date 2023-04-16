export type AnySQSSubscriptionEvent = SQSQueueRequestedEvent | SQSQueueCreated;

export type SQSQueueRequestedEvent = {
  type: 'SQSQueueRequested';
  data: {};
};

export type SQSQueueCreated = {
  type: 'SQSQueueCreated';
  data: {
    sqs_queue_url: string;
  };
};
