import { IEventStore, MinimumEventType } from 'event-store';
import {
  CheckpointAfterNMessages,
  InMemoryCheckpointStore,
  Subscription,
} from 'subscription';

export async function subscribeUntil<
  EventType extends MinimumEventType,
  ReturnType
>(
  eventStore: IEventStore,
  streamName: string,
  position: bigint,
  predicate: (event: EventType) => ReturnType | undefined,
  atMost: number
): Promise<ReturnType | undefined> {
  const controller = new AbortController();
  const subscription = new Subscription(
    eventStore,
    new InMemoryCheckpointStore(position),
    new CheckpointAfterNMessages(1)
  );

  // Start the timer
  const timeout = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, atMost);

  let lastResult: ReturnType | undefined;
  try {
    await subscription.subscribeStream<EventType>(
      streamName,
      async (event) => {
        lastResult = predicate(event);

        if (lastResult) {
          controller.abort();
        }
      },
      controller.signal
    );
  } finally {
    clearTimeout(timeout);
  }

  return lastResult;
}
