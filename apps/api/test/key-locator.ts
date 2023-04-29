import { KeyLocator, PublicKey } from 'store-security';

export class InMemoryKeyLocator implements KeyLocator {
  constructor(
    private readonly keys: Array<{
      storeId: string;
      keyId: string;
      key: PublicKey;
    }>,
    private readonly fallback?: KeyLocator,
  ) {}

  findPublicKey(
    storeId: string,
    keyId: string,
  ): Promise<PublicKey | undefined> {
    const key = this.keys.find(
      (k) => k.storeId === storeId && k.keyId === keyId,
    )?.key;

    if (key) {
      return Promise.resolve(key);
    }

    if (this.fallback) {
      return this.fallback.findPublicKey(storeId, keyId);
    }
  }
}
