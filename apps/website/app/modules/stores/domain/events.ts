type Event<Type extends string, Payload> = {
  id: string;
  type: Type;
  data: Payload;
};

// Events
export type StoreCreated = Event<
  'StoreCreated',
  {
    store_id: string;
    name: string;
    region: 'london';
  }
>;
