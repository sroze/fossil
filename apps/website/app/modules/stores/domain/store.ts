import { AnyStoreEvent, StoreCreated } from './events';
import { JWK } from 'node-jose';
import RawKey = JWK.RawKey;
import { EventWithWrittenMetadata } from '../../event-store/interfaces';

export type StoreState = {
  id: string;
  name: string;
  jwks: {
    id: string;
    name: string;
    type: 'hosted' | 'private';
    public_key: RawKey;
    added_at: string;
  }[];
};

export class Store {
  public state!: StoreState;

  constructor(events: EventWithWrittenMetadata<AnyStoreEvent>[]) {
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

  apply(events: EventWithWrittenMetadata<AnyStoreEvent>[]) {
    for (const { type, data, time } of events) {
      if (type === 'KeyGenerated') {
        if (!data.key_id || !data.public_key) {
          // TODO: deprecated events.
          continue;
        }

        this.state.jwks.push({
          id: data.key_id,
          name: data.name,
          added_at: time.toISOString(),
          public_key: data.public_key,
          type: data.type,
        });
      } else if (type === 'KeyDeleted') {
        this.state.jwks = this.state.jwks.filter(
          (key) => key.id !== data.key_id
        );
      }
    }
  }
}
