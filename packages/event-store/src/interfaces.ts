export type EventWritten<Type = string, Data = any> = {
  id: string;
  type: Type;
  data: Data;
  metadata?: any;
};

export type WrittenEventMetadata = {
  time: Date;
  stream_name: string;
  position: bigint;
  global_position: bigint;
};

export type EventWrittenWithMetadata<Event> = Event & WrittenEventMetadata;

// Identifier will be automatically created if not provided.
export type EventToWrite = Omit<EventWritten, 'id'> & {
  id?: string;
};

export type EventInStore = EventWrittenWithMetadata<EventWritten>;

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
  appendEvents<EventType extends EventToWrite = EventToWrite>(
    streamName: string,
    events: EventToWrite[],
    expectedVersion: bigint | null
  ): Promise<AppendResult>;

  readCategory<EventType extends EventInStore = EventInStore>(
    category: string,
    fromPosition: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventType>;

  readStream<EventType extends EventInStore = EventInStore>(
    stream: string,
    fromPosition: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventType>;

  lastEventFromStream<EventType extends EventInStore = EventInStore>(
    stream: string,
    type?: string
  ): Promise<EventType | undefined>;
}

export class WrongExpectedVersionError extends Error {}
