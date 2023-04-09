import { json, LoaderFunction } from '@remix-run/node';
import { StoreService } from '../../../modules/stores/service';
import type { PublicKey } from 'store-security';
import { loaderWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { assertPermissionOnStore } from '~/utils/security';

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization(args, async ({ params, profile }) => {
    const store_id = params.id!;

    await assertPermissionOnStore(store_id, profile.id);
    const store = await StoreService.resolve().load(store_id);

    return json<{ keys: PublicKey[] }>({
      keys: store.jwks.map((key) => key.public_key),
    });
  });
