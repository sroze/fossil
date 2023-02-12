import { KeyLocator, PublicKey } from 'store-security';

export class InMemoryKeyLocator implements KeyLocator {
  constructor(
    private readonly keys: Array<{
      storeId: string;
      keyId: string;
      key: PublicKey;
    }>,
  ) {}

  findPublicKey(
    storeId: string,
    keyId: string,
  ): Promise<PublicKey | undefined> {
    return Promise.resolve(
      this.keys.find((k) => k.storeId === storeId && k.keyId === keyId)?.key,
    );
  }
}
