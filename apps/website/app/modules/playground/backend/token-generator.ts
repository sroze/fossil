import { StoreService } from '~/modules/stores/service';
import { generateToken } from '~/modules/security/security.backend';
import type { FossilClaims, PrivateKey } from 'store-security';
import { DateTime } from 'luxon';

export async function generatePlaygroundToken(storeId: string) {
  return generateStoreToken(storeId, 'Fossil Playground', {
    read: { streams: ['*'] },
    write: { streams: ['*'] },
  });
}

export async function generateManagementToken(storeId: string) {
  return generateStoreToken(storeId, 'Fossil Management Interface', {
    management: ['subscriptions'],
  });
}

export async function generateStoreToken(
  storeId: string,
  keyName: string,
  claims: Omit<FossilClaims, 'store_id'>
): Promise<string> {
  const store = await StoreService.resolve().load(storeId);

  // Get or generate a private key.
  let privateKey: PrivateKey;
  const keyInStore = store.jwks.find((key) => key.name === keyName);
  if (keyInStore) {
    if (keyInStore.type !== 'hosted') {
      throw new Error(`Key "${keyName}" is not hosted.`);
    }

    privateKey = keyInStore.private_key;
  } else {
    const generatedKey = await StoreService.resolve().createKey(storeId, {
      name: keyName,
      type: 'hosted',
    });

    privateKey = generatedKey.private;
  }

  // Generate the token
  return generateToken(privateKey, {
    exp: Math.round(DateTime.utc().plus({ hour: 2 }).valueOf() / 1000),
    fossil: { ...claims, store_id: storeId },
  });
}
