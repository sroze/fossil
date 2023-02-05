import { LoaderFunctionArgs } from '@remix-run/router';
import { json } from '@remix-run/node';
import { StoreService } from '../../modules/stores/service';
import { PublicKey } from '../../modules/security/interfaces';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const service = await StoreService.resolve().load(params.id!);

  return json<{ keys: PublicKey[] }>({
    keys: service.state.jwks.map((key) => key.public_key),
  });
}
