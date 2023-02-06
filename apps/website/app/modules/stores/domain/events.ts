import { PrivateKey, PublicKey } from '../../security/interfaces';
import { EventWritten } from 'event-store';

// TODO: Can we remove this `store_id` requirement?
type StoreEvent<Type extends string, Payload> = EventWritten<
  Type,
  Payload & { store_id: string }
>;

// Any event
export type AnyStoreEvent = StoreCreated | KeyGenerated | KeyDeleted;

// Events
export type StoreCreated = StoreEvent<
  'StoreCreated',
  {
    name: string;
    region: 'london';
  }
>;

export type KeyGenerated = StoreEvent<
  'KeyGenerated',
  {
    key_id: string;
    name: string;
    public_key: PublicKey;
  } & ({ type: 'private' } | { type: 'hosted'; private_key: PrivateKey })
>;

export type KeyDeleted = StoreEvent<
  'KeyDeleted',
  {
    key_id: string;
  }
>;
