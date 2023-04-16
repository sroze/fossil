/* eslint-disable @typescript-eslint/no-empty-function */
import type { EventInStore, IEventStore } from 'event-store';
import type { ICheckpointStore } from './checkpoint-store/interfaces';
import type { CheckpointStrategy } from './checkpoint-strategy/interfaces';
import { sleep } from './sleep';
import { MinimumEventType } from 'event-store';
import { CheckpointAfterNMessages } from './checkpoint-strategy/message-count';

export type MessageFunctionHandler<
  EventType extends MinimumEventType,
  ReturnType = void
> = (event: EventInStore<EventType>) => Promise<ReturnType>;

export type AdvancedHandler<
  EventType extends MinimumEventType,
  ReturnType = void
> = {
  onMessage: MessageFunctionHandler<EventType, ReturnType>;
  onEOF: (position: bigint) => Promise<ReturnType>;
};

export type Handler<EventType extends MinimumEventType, ReturnType = void> =
  | MessageFunctionHandler<EventType, ReturnType>
  | AdvancedHandler<EventType, ReturnType>;

export function asAdvancedHandler<
  EventType extends MinimumEventType,
  ReturnType = void
>(
  handler:
    | MessageFunctionHandler<EventType, ReturnType>
    | Partial<AdvancedHandler<EventType, ReturnType>>
): AdvancedHandler<EventType, ReturnType | void> {
  if (typeof handler === 'function') {
    return { onMessage: handler, onEOF: () => Promise.resolve() };
  }

  return {
    onMessage: handler.onMessage ?? (() => Promise.resolve()),
    onEOF: handler.onEOF ?? (() => Promise.resolve()),
  };
}

export type StreamFetcher<EventType extends MinimumEventType> = (
  position: bigint,
  signal: AbortSignal
) => AsyncIterable<EventInStore<EventType>>;

export type PositionResolver<EventType extends MinimumEventType> = (
  event: EventInStore<EventType>
) => bigint;

export type SubscribeTo = { stream: string } | { category: string };

type SubscriptionOptions = {
  checkpointStore: ICheckpointStore;
  pollingFrequencyInMs?: number;
  checkpointStrategy?: CheckpointStrategy;
};

const defaultOptions = {
  pollingFrequencyInMs: 100,
  checkpointStrategy: new CheckpointAfterNMessages(1),
};

export class Subscription {
  private readonly pollingFrequencyInMs: number;
  private readonly checkpointStore: ICheckpointStore;
  private readonly checkpointStrategy: CheckpointStrategy;

  constructor(
    private readonly store: IEventStore,
    private readonly subscribeTo: SubscribeTo,
    private readonly options: SubscriptionOptions
  ) {
    this.checkpointStore = options.checkpointStore;
    this.pollingFrequencyInMs =
      options.pollingFrequencyInMs ?? defaultOptions.pollingFrequencyInMs;
    this.checkpointStrategy =
      options.checkpointStrategy ?? defaultOptions.checkpointStrategy;
  }

  async start<
    EventType extends MinimumEventType = MinimumEventType,
    ReturnType = void
  >(
    handler: Handler<EventType, ReturnType>,
    signal: AbortSignal
  ): Promise<void> {
    return this.subscribe<EventType, ReturnType>(
      (position, signal) => {
        return 'category' in this.subscribeTo
          ? this.store.readCategory<EventType>(
              this.subscribeTo.category,
              position,
              signal
            )
          : this.store.readStream<EventType>(
              this.subscribeTo.stream,
              position,
              signal
            );
      },
      (event) => {
        return 'category' in this.subscribeTo
          ? event.global_position
          : event.position + 1n;
      },
      handler,
      signal
    );
  }

  private async subscribe<EventType extends MinimumEventType, ReturnType>(
    streamFetcher: StreamFetcher<EventType>,
    positionResolver: PositionResolver<EventType>,
    handler: Handler<EventType, ReturnType>,
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

        if (signal.aborted) {
          return;
        }
      }

      // If we didn't receive any event, we'll wait a bit before bombarding the database with
      // yet another request.
      if (!hasConsumedEvents) {
        if (!hasEOF) {
          await onEOF(position);
          hasEOF = true;
        }

        await sleep(this.pollingFrequencyInMs, signal);
      }
    }
  }
}

export class AbortError extends Error {
  constructor() {
    super('Aborted');
  }
}
