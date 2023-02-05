export type EventToWrite = {
  /* optional id for the event */
  id?: string;
  type: string;
  data: any;
  metadata?: any;
};

export type EventWithWrittenMetadata<Type> = Type & {
  id: string;
  time: Date;
  stream_name: string;
  position: bigint;
  global_position: bigint;
};

export type EventInStore = EventWithWrittenMetadata<EventToWrite>;

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
  appendEvents(
    streamName: string,
    events: EventToWrite[],
    expectedVersion: bigint | null
  ): Promise<AppendResult>;

  readCategory(
    category: string,
    fromPosition: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore>;

  readStream(
    stream: string,
    fromPosition: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore>;

  lastEventFromStream(
    stream: string,
    type?: string
  ): Promise<EventInStore | undefined>;
}
