/* eslint-disable @typescript-eslint/no-empty-function */
import type { EventInStore, IEventStore } from 'event-store';
import type { ICheckpointStore } from './checkpoint-store/interfaces';
import type { CheckpointStrategy } from './checkpoint-strategy/interfaces';
import { sleep } from './sleep';
import { MinimumEventType } from 'event-store';

type MessageFunctionHandler<EventType extends MinimumEventType> = (
  event: EventInStore<EventType>
) => Promise<void>;
type AdvancedHandler<EventType extends MinimumEventType> = {
  onMessage: MessageFunctionHandler<EventType>;
  onEOF: () => Promise<void>;
};

export type Handler<EventType extends MinimumEventType> =
  | MessageFunctionHandler<EventType>
  | AdvancedHandler<EventType>;

function asAdvancedHandler<T extends MinimumEventType>(
  handler: Handler<T>
): AdvancedHandler<T> {
  if (typeof handler === 'function') {
    return { onMessage: handler, onEOF: () => Promise.resolve() };
  }

  return handler;
}

export type StreamFetcher<EventType extends MinimumEventType> = (
  position: bigint,
  signal: AbortSignal
) => AsyncIterable<EventInStore<EventType>>;

export type PositionResolver<EventType extends MinimumEventType> = (
  event: EventInStore<EventType>
) => bigint;

export class Subscription {
  constructor(
    private readonly store: IEventStore,
    private readonly checkpointStore: ICheckpointStore,
    private readonly checkpointStrategy: CheckpointStrategy,
    private readonly pollingFrequencyInMs = 100
  ) {}

  async subscribeCategory<
    EventType extends MinimumEventType = MinimumEventType
  >(
    category: string,
    handler: Handler<EventType>,
    signal: AbortSignal
  ): Promise<void> {
    return this.subscribe<EventType>(
      (position, signal) =>
        this.store.readCategory<EventType>(category, position, signal),
      (event) => event.global_position,
      handler,
      signal
    );
  }

  async subscribeStream<EventType extends MinimumEventType = MinimumEventType>(
    stream: string,
    handler: Handler<EventType>,
    signal: AbortSignal
  ): Promise<void> {
    return this.subscribe<EventType>(
      (position, signal) =>
        this.store.readStream<EventType>(stream, position, signal),
      (event) => event.position + 1n,
      handler,
      signal
    );
  }

  private async subscribe<EventType extends MinimumEventType>(
    streamFetcher: StreamFetcher<EventType>,
    positionResolver: PositionResolver<EventType>,
    handler: Handler<EventType>,
    signal: AbortSignal
  ): Promise<void> {
    const { onMessage, onEOF } = asAdvancedHandler(handler);
    let position = await this.checkpointStore.getCheckpoint();
    let hasEOF: boolean = false;

    while (!signal.aborted) {
      let hasConsumedEvents: boolean = false;

      for await (const event of streamFetcher(position, signal)) {
        await onMessage(event);

        hasConsumedEvents = true;
        position = positionResolver(event);

        if (this.checkpointStrategy.shouldCheckpoint()) {
          await this.checkpointStore.storeCheckpoint(position);
        }
      }

      // If we didn't receive any event, we'll wait a bit before bombarding the database with
      // yet another request.
      if (!hasConsumedEvents) {
        if (!hasEOF) {
          await onEOF();
          hasEOF = true;
        }

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
