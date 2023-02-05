import {
  AppendResult,
  EventInStore,
  EventToWrite,
  IEventStore,
} from '../event-store/interfaces';
import { fossilEventStore } from '../event-store/store.backend';

export class TenantedEventEncoder {
  constructor(private readonly prefix: string) {}

  public encodeStream(stream: string): string {
    return this.prefix + stream;
  }

  public decodeStream(stream: string): string {
    if (!stream.startsWith(this.prefix)) {
      throw new Error(`Stream cannot be decoded.`);
    }

    return stream.slice(this.prefix.length);
  }

  public decodeEvent({ stream_name, ...rest }: EventInStore): EventInStore {
    return {
      ...rest,
      stream_name: this.decodeStream(stream_name),
    };
  }
}

export class TenantedStore implements IEventStore {
  private encoder: TenantedEventEncoder;

  constructor(
    private readonly implementation: IEventStore,
    private readonly tenantIdentifier: string
  ) {
    if (tenantIdentifier.indexOf('-') !== -1) {
      throw new Error(`Tenant identifier cannot contain a dash.`);
    }

    this.encoder = new TenantedEventEncoder(tenantIdentifier + '#');
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

export function storeForIdentifier(id: string): IEventStore {
  if (!id) {
    throw new Error(`Identifier provided is invalid.`);
  }

  return new TenantedStore(fossilEventStore, id.replace(/-/g, ''));
}
