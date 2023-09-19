import { IEventStore } from 'event-store';
import { AnySubscriptionEvent } from '../domain/events';
import { Subscription } from '../domain/category';

export const createSubscription = async (
  store: IEventStore,
  storeId: string,
  subscriptionId: string,
  category: string,
  name = 'My subscription',
): Promise<void> => {
  await store.appendEvents<AnySubscriptionEvent>(
    Subscription.stream(subscriptionId),
    [
      {
        type: 'SubscriptionCreated',
        data: {
          store_id: storeId,
          category,
          name,
        },
      },
    ],
    -1n,
  );
};
