import { JWK, JWS } from 'node-jose';
import { JwtPayload } from 'jsonwebtoken';
import { FossilClaims } from './interfaces';

export async function generateToken(
  key: Parameters<(typeof JWK)['asKey']>[0],
  claims: JwtPayload & { fossil: FossilClaims }
): Promise<any> {
  const payload = JSON.stringify(claims);
  const opt = { compact: true, jwk: key, fields: { typ: 'jwt' } };
  const token = await JWS.createSign(opt, await JWK.asKey(key))
    .update(payload)
    .final();

  return token;
}
