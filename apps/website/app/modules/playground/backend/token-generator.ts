import { StoreService } from '~/modules/stores/service';
import { generateToken } from '~/modules/security/security.backend';
import type { PrivateKey } from 'store-security';
import { DateTime } from 'luxon';

const KeyName = 'Fossil Playground';
export async function generatePlaygroundToken(
  storeId: string
): Promise<string> {
  const store = await StoreService.resolve().load(storeId);

  // Get or generate a private key.
  let privateKey: PrivateKey;
  const keyInStore = store.jwks.find((key) => key.name === KeyName);
  if (keyInStore) {
    if (keyInStore.type !== 'hosted') {
      throw new Error(`Key "${KeyName}" is not hosted.`);
    }

    privateKey = keyInStore.private_key;
  } else {
    const generatedKey = await StoreService.resolve().createKey(storeId, {
      name: KeyName,
      type: 'hosted',
    });

    privateKey = generatedKey.private;
  }

  // Generate the token
  return generateToken(privateKey, {
    exp: Math.round(DateTime.utc().plus({ hour: 2 }).valueOf() / 1000),
    fossil: {
      store_id: storeId,
      read: { streams: ['*'] },
      write: { streams: ['*'] },
    },
  });
}
