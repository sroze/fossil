import * as jose from 'node-jose';
import { JWK } from 'node-jose';
import RawKey = JWK.RawKey;

export async function generateKey(): Promise<{
  public: RawKey;
  private: RawKey & Record<string, string>;
}> {
  const keystore = jose.JWK.createKeyStore();
  const key = await keystore.generate('RSA', 2048, {
    alg: 'RS256',
    use: 'sig',
  });

  return {
    public: key.toJSON(false) as RawKey,
    private: key.toJSON(true) as any,
  };
}
