export type AnySubscriptionEvent =
  | SubscriptionCreated
  | SubscriptionReady
  | SubscriptionDeleted;

export type SubscriptionCreated = {
  type: 'SubscriptionCreated';
  data: {
    store_id: string;
    category: string;
    name: string;
    type: 'managed-queue';
  };
};

export type SubscriptionReady = {
  type: 'SubscriptionReady';
  data: {};
};

export type SubscriptionDeleted = {
  type: 'SubscriptionDeleted';
  data: {};
};
