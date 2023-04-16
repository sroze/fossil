import { AnySQSSubscriptionEvent } from '../domain/events';
import { IEventStore } from 'event-store';

export const requestSqsQueue = async (
  store: IEventStore,
  subscriptionId: string,
): Promise<void> => {
  await store.appendEvents<AnySQSSubscriptionEvent>(
    `Subscription-${subscriptionId}`,
    [
      {
        type: 'SQSQueueRequested',
        data: {},
      },
    ],
    null,
  );
};
