import {
  AppendResult,
  EventInStore,
  EventToWrite,
  IEventStore,
} from '../../event-store/interfaces';
import { PrefixedStreamEventEncoder } from './prefix-encoder';

export class TenantedStore implements IEventStore {
  private encoder: PrefixedStreamEventEncoder;

  constructor(
    private readonly implementation: IEventStore,
    private readonly tenantIdentifier: string
  ) {
    if (tenantIdentifier.indexOf('-') !== -1) {
      throw new Error(`Tenant identifier cannot contain a dash.`);
    }

    this.encoder = new PrefixedStreamEventEncoder(tenantIdentifier + '#');
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

  async lastEventFromStream(
    stream: string,
    type?: string
  ): Promise<EventInStore | undefined> {
    const event = await this.implementation.lastEventFromStream(
      this.encoder.encodeStream(stream),
      type
    );
    if (event) {
      return this.encoder.decodeEvent(event);
    }

    return undefined;
  }

  async *readCategory(
    category: string,
    fromPosition: bigint,
    signal?: AbortSignal
  ): AsyncIterable<EventInStore> {
    for await (const event of this.implementation.readCategory(
      this.encoder.encodeStream(category),
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
