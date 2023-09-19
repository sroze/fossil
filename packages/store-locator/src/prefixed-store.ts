import {
  AppendResult,
  EventInStore,
  EventToWrite,
  IEventStore,
  MinimumEventType,
} from 'event-store';
import { PrefixedStreamEventEncoder } from './prefix-encoder';

export class PrefixedStore implements IEventStore {
  private encoder: PrefixedStreamEventEncoder;

  constructor(
    private readonly implementation: IEventStore,
    private readonly prefix: string
  ) {
    this.encoder = new PrefixedStreamEventEncoder(prefix);
  }

  appendEvents(
    streamName: string,
    events: EventToWrite[],
    expectedVersion: bigint | null
  ): Promise<AppendResult> {
    return this.implementation.appendEvents(
      this.encoder.encodeStream(streamName),
      events,
      expectedVersion
    );
  }

  async lastEventFromStream<EventType extends MinimumEventType>(
    stream: string,
    type?: string
  ): Promise<EventInStore<EventType> | undefined> {
    const event = await this.implementation.lastEventFromStream(
      this.encoder.encodeStream(stream),
      type
    );
    if (event) {
      return this.encoder.decodeEvent(event) as EventInStore<EventType>;
    }

    return undefined;
  }

  async *readCategory<EventType extends MinimumEventType = MinimumEventType>(
    category: string,
    fromPosition?: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore<EventType>> {
    for await (const event of this.implementation.readCategory(
      this.encoder.encodeStream(category),
      fromPosition,
      signal
    )) {
      yield this.encoder.decodeEvent(event) as EventInStore<EventType>;
    }
  }

  async *readStream<EventType extends MinimumEventType = MinimumEventType>(
    stream: string,
    fromPosition: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore<EventType>> {
    for await (const event of this.implementation.readStream(
      this.encoder.encodeStream(stream),
      fromPosition,
      signal
    )) {
      yield this.encoder.decodeEvent(event) as EventInStore<EventType>;
    }
  }
  async statisticsAtPosition(category: string, position: bigint) {
    return this.implementation.statisticsAtPosition(
      this.encoder.encodeStream(category),
      position
    );
  }
}
