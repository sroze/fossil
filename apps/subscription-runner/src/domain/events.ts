export type AnySubscriptionEvent = SubscriptionCreated | SubscriptionReady;

export type SubscriptionType = 'managed-queue' /** | 'provided-sqs' **/;
export type SubscriptionCreated = {
  type: 'SubscriptionCreated';
  data: {
    store_id: string;
    category: string;
    name: string;
    type: SubscriptionType;
  };
};

export type SubscriptionReady = {
  type: 'SubscriptionReady';
  data: {
    store_id: string;
    category: string;
    sqs_queue_url: string;
  };
};
