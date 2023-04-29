import type { PrivateKey, PublicKey } from 'store-security';

export type AnyStoreEvent =
  | StoreCreatedEvent
  | StoreDeletedEvent
  | KeyCreatedEvent
  | KeyDeletedEvent;

type StoreCreatedEvent = {
  type: 'StoreCreated';
  data: {
    name: string;
  };
};

type StoreDeletedEvent = {
  type: 'StoreDeleted';
  data: {};
};

type KeyDeletedEvent = {
  type: 'KeyDeleted';
  data: {
    key_id: string;
  };
};

type KeyCreatedEvent = {
  type: 'KeyCreated';
  data: {
    key_id: string;
    name: string;
    public_key: PublicKey;
    private_key?: PrivateKey;
  };
};
