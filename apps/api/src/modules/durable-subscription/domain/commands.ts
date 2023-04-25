export type AnySubscriptionCommand =
  | CreateSubscriptionCommand
  | DeleteSubscriptionCommand;

export type CreateSubscriptionCommand = {
  type: 'CreateSubscription';
  data: {
    store_id: string;
    category: string;
    name: string;
  };
};

export type DeleteSubscriptionCommand = {
  type: 'DeleteSubscription';
  data: object;
};
