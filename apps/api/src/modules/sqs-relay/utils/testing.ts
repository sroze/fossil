import { AnySQSTargetEvent } from '../domain/events';
import { IEventStore } from 'event-store';
import { SqsRelay } from '../domain/category';

export const requestSqsQueue = async (
  store: IEventStore,
  subscriptionId: string,
): Promise<void> => {
  await store.appendEvents<AnySQSTargetEvent>(
    SqsRelay.stream(subscriptionId),
    [
      {
        type: 'SQSQueueRequested',
        data: {},
      },
    ],
    null,
  );
};
