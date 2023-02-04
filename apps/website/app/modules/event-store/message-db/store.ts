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

  async *readCategory(
    category: string,
    fromPosition: bigint = 0n,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore> {
    yield* streamByBatch(
      (position, batchSize) =>
        this.client.getCategoryMessages(category, position, batchSize),

      // IEventStore positions are exclusive, MessageDb positions are inclusive
      // We want the API to be "give me all events that occured *after* what I've currently seen
      fromPosition + 1n,
      signal
    );
  }

  async *readStream(
    stream: string,
    fromPosition: bigint = 0n,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore> {
    yield* streamByBatch(
      (position, batchSize) =>
        this.client.getStreamMessages(stream, position, batchSize),

      // IEventStore positions are exclusive, MessageDb positions are inclusive
      // We want the API to be "give me all events that occured *after* what I've currently seen
      fromPosition,
      signal
    );
  }

  lastEventFromStream(
    stream: string,
    type?: string
  ): Promise<EventInStore | undefined> {
    return this.client.getLastStreamMessage(stream, type);
  }
}

// TODO: This can be optimised to pre-fetch next batch's while yielding the
//       currently fetched items.
async function* streamByBatch(
  fetcher: (fromPosition: bigint, batchSize: number) => Promise<EventInStore[]>,
  fromPosition: bigint,
  signal?: AbortSignal
): AsyncIterable<EventInStore> {
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
