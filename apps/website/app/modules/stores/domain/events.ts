import { JWK } from 'node-jose';

import RawKey = JWK.RawKey;

type Event<Type extends string, Payload> = {
  id: string;
  type: Type;
  data: Payload;
};

// TODO: Can we remove this `store_id` requirement?
type StoreEvent<Type extends string, Payload> = Event<
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
    public_key: RawKey;
  } & ({ type: 'private' } | { type: 'hosted'; private_key: RawKey })
>;

export type KeyDeleted = StoreEvent<
  'KeyDeleted',
  {
    key_id: string;
  }
>;
