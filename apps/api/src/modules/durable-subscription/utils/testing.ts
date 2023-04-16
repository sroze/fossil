import { IEventStore } from 'event-store';
import { RequestOptions } from 'http';
import { AnySubscriptionEvent } from '../domain/events';
import { TestApplication } from '../../../../test/test-application';
import { StreamClient } from '../../ephemeral-subscription/utils/testing';

export const createSubscription = async (
  store: IEventStore,
  storeId: string,
  subscriptionId: string,
  category: string,
  name = 'My subscription',
): Promise<void> => {
  await store.appendEvents<AnySubscriptionEvent>(
    `Subscription-${subscriptionId}`,
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

export class NdjsonClient<T = object> extends StreamClient<T> {
  constructor(app: TestApplication, request: RequestOptions) {
    super(app, request, (chunk) => {
      return chunk
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    });
  }
}
