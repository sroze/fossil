import type { PrivateKey, PublicKey } from 'store-security';

export type AnyStoreCommand =
  | CreateStoreCommand
  | DeleteStoreCommand
  | CreateKeyCommand
  | DeleteKeyCommand;

type CreateStoreCommand = {
  type: 'CreateStore';
  data: {
    name: string;
  };
};

type DeleteStoreCommand = {
  type: 'DeleteStore';
  data: {};
};

type DeleteKeyCommand = {
  type: 'DeleteKey';
  data: {
    key_id: string;
  };
};

/**
 * Create a key pair.
 *
 * When the private key is not provided, it means that the key will only be used
 * to verify tokens, and won't be able to be used to generate tokens through
 * the API.
 */
type CreateKeyCommand = {
  type: 'CreateKey';
  data: {
    key_id: string;
    name: string;
    public_key: PublicKey;
    private_key?: PrivateKey;
  };
};
