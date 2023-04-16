export type AnySubscriptionEvent =
  | SubscriptionCreated
  | SQSQueueCreated
  | SubscriptionDeleted;

export type SubscriptionCreated = {
  type: 'SubscriptionCreated';
  data: {
    store_id: string;
    category: string;
    name: string;
  };
};

export type SQSQueueCreated = {
  type: 'SQSQueueCreated';
  data: {};
};

export type SubscriptionDeleted = {
  type: 'SubscriptionDeleted';
  data: {};
};
