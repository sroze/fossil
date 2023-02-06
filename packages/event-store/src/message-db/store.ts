import {
  AppendResult,
  EventInStore,
  EventToWrite,
  IEventStore,
} from '../interfaces';
import { MessageDbClient } from './client';

export class MessageDbStore implements IEventStore {
  constructor(private readonly client: MessageDbClient) {}

  appendEvents(
    streamName: string,
    events: EventToWrite[],
    expectedVersion: bigint | null
  ): Promise<AppendResult> {
    return this.client.writeMessages(streamName, events, expectedVersion);
  }

  async *readCategory<EventType extends EventInStore = EventInStore>(
    category: string,
    fromPosition: bigint = 0n,
    signal?: AbortSignal
  ): AsyncIterable<EventType> {
    yield* streamByBatch<EventType>(
      (position, batchSize) =>
        this.client.getCategoryMessages<EventType>(
          category,
          position,
          batchSize
        ),

      // IEventStore positions are exclusive, MessageDb positions are inclusive
      // We want the API to be "give me all events that occured *after* what I've currently seen
      fromPosition + 1n,
      signal
    );
  }

  async *readStream<EventType extends EventInStore = EventInStore>(
    stream: string,
    fromPosition: bigint = 0n,
    signal?: AbortSignal
  ): AsyncIterable<EventType> {
    yield* streamByBatch<EventType>(
      (position, batchSize) =>
        this.client.getStreamMessages<EventType>(stream, position, batchSize),
      fromPosition,
      signal
    );
  }

  lastEventFromStream<EventType extends EventInStore = EventInStore>(
    stream: string,
    type?: string
  ): Promise<EventType | undefined> {
    return this.client.getLastStreamMessage(stream, type);
  }
}

// TODO: This can be optimised to pre-fetch next batch's while yielding the
//       currently fetched items.
async function* streamByBatch<EventType extends EventInStore>(
  fetcher: (fromPosition: bigint, batchSize: number) => Promise<EventType[]>,
  fromPosition: bigint,
  signal?: AbortSignal
): AsyncIterable<EventType> {
  const batchSize = 100;

  while (signal === undefined || !signal.aborted) {
    const batch = await fetcher(fromPosition, batchSize);
    for (const event of batch) {
      yield event;
    }

    if (batch.length < batchSize) {
      break;
    }

    fromPosition = batch[batch.length - 1].global_position;
  }
}
