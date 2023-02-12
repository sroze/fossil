import { FossilClaims, KeyLocator } from './interfaces';
import { decode, verify, Jwt, JwtPayload } from 'jsonwebtoken';
import { JWK, JWS } from 'node-jose';

export class TokenAuthenticator {
  constructor(private readonly keyLocator: KeyLocator) {}

  /**
   * This method does the heavy lifting in authorizing somebody's token. In a nutshell, it will validate
   * that the token:
   *
   * - Has been signed by a key belonging to this store
   * - Is indeed intended to be used for this store.
   * - Has a valid Fossil payload.
   */
  async authorize(storeId: string, token: string): Promise<FossilClaims> {
    const unverifiedToken = decode(token, { complete: true }) as Jwt;
    const unverifiedPayload = unverifiedToken.payload as JwtPayload;
    if (!('fossil' in unverifiedPayload)) {
      throw new Error(`Token's payload is not a Fossil one.`);
    } else if (unverifiedPayload.fossil.store_id !== storeId) {
      throw new Error(`This token was not intended to be used on this store.`);
    } else if (!unverifiedToken.header.kid) {
      throw new Error(`The token provided does not have a key identifier.`);
    }

    const key = await this.keyLocator.findPublicKey(
      storeId,
      unverifiedToken.header.kid
    );
    if (!key) {
      throw new Error(`The token provided was signed by an unknown key.`);
    }

    // Verify the token was signed with this key.
    await JWS.createVerify(await JWK.asKey(key)).verify(token);

    // TODO: Validates the fossil payload.

    return unverifiedPayload.fossil as FossilClaims;
  }
}
