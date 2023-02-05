import { JWK } from 'node-jose';
import RawKey = JWK.RawKey;

export type PublicKey = RawKey;
export type PrivateKey = RawKey & Record<string, string>;
