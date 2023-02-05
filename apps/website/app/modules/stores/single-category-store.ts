import {
  AppendResult,
  EventInStore,
  EventToWrite,
  IEventStore,
} from '../event-store/interfaces';
import { PrefixedStreamEventEncoder } from './tenancy/prefix-encoder';

export const UniqueCategory = 'Default';
export class SingleCategoryStore implements IEventStore {
  private encoder: PrefixedStreamEventEncoder;

  constructor(
    private readonly implementation: IEventStore,
    private readonly category: string
  ) {
    this.encoder = new PrefixedStreamEventEncoder(`${category}-`);
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

  lastEventFromStream(
    stream: string,
    type?: string
  ): Promise<EventInStore | undefined> {
    return this.implementation.lastEventFromStream(
      this.encoder.encodeStream(stream),
      type
    );
  }

  async *readCategory(
    category: string,
    fromPosition: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore> {
    if (category !== UniqueCategory) {
      throw new Error(`Only the "${UniqueCategory}" category is supported.`);
    }

    for await (const event of this.implementation.readCategory(
      this.category,
      fromPosition,
      signal
    )) {
      yield this.encoder.decodeEvent(event);
    }
  }

  async *readStream(
    stream: string,
    fromPosition: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore> {
    for await (const event of this.implementation.readStream(
      this.encoder.encodeStream(stream),
      fromPosition,
      signal
    )) {
      yield this.encoder.decodeEvent(event);
    }
  }
}
