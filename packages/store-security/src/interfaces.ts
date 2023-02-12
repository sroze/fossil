import { JWK } from 'node-jose';
import RawKey = JWK.RawKey;

export type PublicKey = RawKey;
export type PrivateKey = RawKey & Record<string, string>;
export type GeneratedKey = {
  public: PublicKey;
  private: PrivateKey;
};

export interface KeyLocator {
  findPublicKey(storeId: string, keyId: string): Promise<PublicKey | undefined>;
}

export interface FossilClaims {
  store_id: string;

  read?: {
    streams: string[];
  };

  write?: {
    streams: string[];
    types?: string[];
  };
}
