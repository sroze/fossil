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

export type ReadClaims = {
  streams: string[];
};

export type WriteClaims = {
  streams: string[];
  types?: string[];
};

export interface FossilClaims {
  store_id: string;
  read?: ReadClaims;
  write?: WriteClaims;
}
