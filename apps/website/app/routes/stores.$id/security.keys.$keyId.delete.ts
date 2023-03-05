import { ActionFunction, redirect } from '@remix-run/node';
import { StoreService } from '../../modules/stores/service';

export const action: ActionFunction = async ({ params }) => {
  await StoreService.resolve().execute(params.id!, {
    type: 'DeleteKey',
    data: { key_id: params.keyId! },
  });

  return redirect(`/stores/${params.id!}/security`);
};
