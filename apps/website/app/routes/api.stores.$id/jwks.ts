import { LoaderFunctionArgs } from '@remix-run/router';
import { json } from '@remix-run/node';
import { StoreService } from '../../modules/stores/service';
import type { PublicKey } from 'store-security';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const store = await StoreService.resolve().load(params.id!);

  return json<{ keys: PublicKey[] }>({
    keys: store.jwks.map((key) => key.public_key),
  });
}
