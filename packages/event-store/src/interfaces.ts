export type MinimumEventType = {
  type: string;
  data: any;
};

type WrittenEventMetadata = {
  id: string;
  time: Date;
  stream_name: string;
  position: bigint;
  global_position: bigint;
  metadata?: any;
};

export type EventInStore<Event extends MinimumEventType = MinimumEventType> =
  Event & WrittenEventMetadata;
export type EventToWrite<Event extends MinimumEventType = MinimumEventType> =
  Event & {
    id?: string;
    metadata?: any;
  };

export type AppendResult = {
  /* The new position of the stream */
  position: bigint;

  /* The new global order. Useful for cache busting  */
  global_position: bigint;
};

export interface IEventStore {
  /**
   * Append events to a stream transactionally.
   *
   * @param streamName The name of the stream in the canonical `Category-id` format
   * @param events The list of events to append
   * @param expectedVersion The version we expect the stream to be at for OCC. -1 for "no stream"
   */
  appendEvents<EventType extends MinimumEventType = MinimumEventType>(
    streamName: string,
    events: EventToWrite<EventType>[],
    expectedVersion: bigint | null
  ): Promise<AppendResult>;

  readCategory<EventType extends MinimumEventType = MinimumEventType>(
    category: string,
    fromPosition?: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore<EventType>>;

  readStream<EventType extends MinimumEventType = MinimumEventType>(
    stream: string,
    fromPosition?: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore<EventType>>;

  lastEventFromStream<EventType extends MinimumEventType = MinimumEventType>(
    stream: string,
    type?: string
  ): Promise<EventInStore<EventType> | undefined>;
}

export class WrongExpectedVersionError extends Error {}
