import { PrivateKey, PublicKey } from 'store-security';
export type AnyStoreEvent = KeyGenerated;

export type KeyGenerated = {
  type: 'KeyGenerated';
  data: {
    key_id: string;
    name: string;
    public_key: PublicKey;
  } & ({ type: 'private' } | { type: 'hosted'; private_key: PrivateKey });
};
