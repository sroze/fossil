import { ActionFunction, redirect } from '@remix-run/node';
import { StoreService } from '../../modules/stores/service';

export const action: ActionFunction = async ({ params }) => {
  await StoreService.resolve().write(params.id!, [
    {
      type: 'KeyDeleted',
      data: { key_id: params.keyId!, store_id: params.id! },
    },
  ]);

  return redirect(`/stores/${params.id!}/security`);
};
