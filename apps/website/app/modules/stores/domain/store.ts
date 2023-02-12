import { AnyStoreEvent, StoreCreated } from './events';
import type { EventWrittenWithMetadata } from 'event-store';
import { PrivateKey, PublicKey } from 'store-security';

export type StoreState = {
  id: string;
  name: string;
  jwks: {
    id: string;
    name: string;
    type: 'hosted' | 'private';
    public_key: PublicKey;
    private_key?: PrivateKey;
    added_at: string;
  }[];
};

export class Store {
  public state!: StoreState;

  constructor(events: EventWrittenWithMetadata<AnyStoreEvent>[]) {
    if (events.length === 0 || events[0].type !== 'StoreCreated') {
      throw new Error(
        `Store must be created from events, for first should be 'StoreCreated'.`
      );
    }

    this.state = {
      id: events[0].data.store_id,
      name: events[0].data.name,
      jwks: [],
    };

    this.apply(events.splice(1));
  }

  apply(events: EventWrittenWithMetadata<AnyStoreEvent>[]) {
    for (const { type, data, time } of events) {
      if (type === 'KeyGenerated') {
        if (!data.key_id || !data.public_key) {
          // TODO: deprecated events.
          continue;
        }

        this.state.jwks.push({
          id: data.key_id,
          added_at: time.toISOString(),
          ...data,
        });
      } else if (type === 'KeyDeleted') {
        this.state.jwks = this.state.jwks.filter(
          (key) => key.id !== data.key_id
        );
      }
    }
  }
}
