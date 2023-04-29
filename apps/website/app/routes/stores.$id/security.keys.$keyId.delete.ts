import { ActionFunction, redirect } from '@remix-run/node';
import { getAuthenticatedStoreApi } from '../../modules/stores/service';

export const action: ActionFunction = async ({ params }) => {
  const store_id = params.id!;
  const api = await getAuthenticatedStoreApi(store_id);
  await api.deleteKey(store_id, params.keyId!);

  // TODO: add consistency guarantee on redirect.

  return redirect(`/stores/${params.id!}/security`);
};
