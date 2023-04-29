import { ActionFunction, json } from '@remix-run/node';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { assertPermissionOnStore } from '~/utils/security';
import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { getAuthenticatedStoreApi } from '~/modules/stores/service';

export const generateKeyValidator = withZod(
  z.object({
    name: z.string().min(1),
    type: z.enum(['managed', 'downloaded']),
  })
);

export const action: ActionFunction = (args) =>
  actionWithAuthorization(args, async ({ request, params, profile }) => {
    const store_id = params.id!;
    await assertPermissionOnStore(store_id, profile.id);

    const { data, error } = await generateKeyValidator.validate(
      await request.formData()
    );

    if (error) {
      return json(error, 400);
    }

    const api = await getAuthenticatedStoreApi(store_id);
    const { data: response } = await api.createKey(store_id, data);

    return response;
  });
