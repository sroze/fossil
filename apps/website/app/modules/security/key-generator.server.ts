import { JWK } from 'node-jose';
import { PrivateKey, PublicKey } from './interfaces';

export async function generateKey(): Promise<{
  public: PublicKey;
  private: PrivateKey;
}> {
  const keystore = JWK.createKeyStore();
  const key = await keystore.generate('RSA', 2048, {
    alg: 'RS256',
    use: 'sig',
  });

  return {
    public: key.toJSON(false) as PublicKey,
    private: key.toJSON(true) as PrivateKey,
  };
}
