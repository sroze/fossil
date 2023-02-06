/* eslint-disable @typescript-eslint/no-empty-function */
import type { EventInStore } from 'event-store';
import type { ICheckpointStore } from './checkpoint-store/interfaces';
import type { CheckpointStrategy } from './checkpoint-strategy/interfaces';

export type StreamFetcher<EventType = EventInStore> = (
  position: bigint,
  signal: AbortSignal
) => AsyncIterable<EventType>;

export type PositionResolver<EventType = EventInStore> = (
  event: EventType
) => bigint;

export class Subscription {
  constructor(
    private readonly checkpointStore: ICheckpointStore,
    private readonly checkpointStrategy: CheckpointStrategy,
    private readonly pollingFrequencyInMs = 100
  ) {}

  async subscribe<EventType = EventInStore>(
    streamFetcher: StreamFetcher<EventType>,
    positionResolver: PositionResolver<EventType>,
    handler: (event: EventType) => Promise<void>,
    signal: AbortSignal
  ): Promise<void> {
    let position = await this.checkpointStore.getCheckpoint();

    while (!signal.aborted) {
      let hasConsumedEvents: boolean = false;

      for await (const event of streamFetcher(position, signal)) {
        await handler(event);

        hasConsumedEvents = true;
        position = positionResolver(event);

        if (this.checkpointStrategy.shouldCheckpoint()) {
          await this.checkpointStore.storeCheckpoint(position);
        }
      }

      // If we didn't receive any event, we'll wait a bit before bombarding the database with
      // yet another request.
      if (!hasConsumedEvents) {
        await sleep(this.pollingFrequencyInMs, signal).catch(() => {});
      }
    }
  }
}

export class AbortError extends Error {
  constructor() {
    super('Aborted');
  }
}

function sleep(dueTime: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AbortError());
    }
    const id = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      if (signal.aborted) {
        onAbort();
        return;
      }
      resolve();
    }, dueTime);
    signal.addEventListener('abort', onAbort, { once: true });

    function onAbort() {
      clearTimeout(id);
      reject(new AbortError());
    }
  });
}
