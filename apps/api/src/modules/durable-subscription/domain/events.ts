export type AnySubscriptionEvent = SubscriptionCreated | SubscriptionDeleted;

export type SubscriptionCreated = {
  type: 'SubscriptionCreated';
  data: {
    store_id: string;
    category: string;
    name: string;
  };
};

export type SubscriptionDeleted = {
  type: 'SubscriptionDeleted';
  data: {};
};
