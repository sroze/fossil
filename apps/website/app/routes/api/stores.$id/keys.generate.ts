import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { ActionFunction, DataFunctionArgs, json } from '@remix-run/node';
import { generateKey } from '../../../modules/security/security.backend';
import { StoreService } from '../../../modules/stores/service';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { assertPermissionOnStore } from '~/utils/security';

export const generateKeyValidator = withZod(
  z.object({
    name: z.string().min(1),
    type: z.enum(['private', 'hosted']),
  })
);

export type SuccessfulGenerateKeyResponse = Awaited<
  ReturnType<typeof generateKey>
>;

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

    const key = await StoreService.resolve().createKey(store_id, data);

    return json<SuccessfulGenerateKeyResponse>(key);
  });
