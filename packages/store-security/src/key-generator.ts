import { JWK } from 'node-jose';
import { GeneratedKey, PrivateKey, PublicKey } from './interfaces';

export async function generateKey(): Promise<GeneratedKey> {
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
