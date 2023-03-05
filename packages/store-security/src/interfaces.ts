import type { JWK } from 'node-jose';

export type PublicKey = JWK.RawKey;
export type PrivateKey = JWK.RawKey & Record<string, string>;
export type GeneratedKey = {
  public: PublicKey;
  private: PrivateKey;
};

export interface KeyLocator {
  /**
   * Find a public key from its `kid` found in the token.
   *
   */
  findPublicKey(storeId: string, kid: string): Promise<PublicKey | undefined>;
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
