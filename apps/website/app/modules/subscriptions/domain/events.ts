import { EventWritten } from 'event-store';

export type AnySubscriptionEvent = SubscriptionCreated;

export type SubscriptionCreated = EventWritten<
  'SubscriptionCreated',
  {
    subscription_id: string;
    store_id: string;
    type: string;
    name: string;
  }
>;
