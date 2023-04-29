import { FossilClaims, KeyLocator } from './interfaces';
import { decode, Jwt, JwtPayload } from 'jsonwebtoken';
import { JWK, JWS } from 'node-jose';

export type JwtPayloadWithFossil = JwtPayload & { fossil: FossilClaims };

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
  async authorize(
    storeId: string,
    token: string
  ): Promise<{ claims: JwtPayloadWithFossil; public_kid: string }> {
    const unverifiedToken = decode(token, { complete: true });
    if (!unverifiedToken) {
      throw new Error(`Provided token was invalid.`);
    }

    const unverifiedPayload = unverifiedToken.payload as JwtPayloadWithFossil;
    if (!('fossil' in unverifiedPayload)) {
      throw new Error(`Token's payload is not a Fossil one.`);
    } else if (unverifiedPayload.fossil.store_id !== storeId) {
      throw new Error(`This token was not intended to be used on this store.`);
    } else if (!unverifiedToken.header.kid) {
      throw new Error(`The token provided does not have a key identifier.`);
    }

    const public_kid = unverifiedToken.header.kid;
    const publicKey = await this.keyLocator.findPublicKey(storeId, public_kid);
    if (!publicKey) {
      throw new Error(`The token provided was signed by an unknown key.`);
    }

    // Verify the token was signed with this key.
    await JWS.createVerify(await JWK.asKey(publicKey)).verify(token);

    // TODO: Validates the fossil payload.

    return { claims: unverifiedPayload, public_kid };
  }
}
