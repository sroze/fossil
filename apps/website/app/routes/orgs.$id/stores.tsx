import { ActionFunction, redirect } from '@remix-run/node';
import { withZod } from '@remix-validated-form/with-zod';
import { validationError } from 'remix-validated-form';
import { z } from 'zod';
import { v4 } from 'uuid';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { serializeCheckpoint } from '~/utils/eventual-consistency';
import { organisation } from '~/modules/organisations/service';

export const generateStoreValidator = withZod(
  z.object({
    name: z
      .string()
      .min(3, { message: "Store's name must be at least 3 letters" }),
  })
);

export const action: ActionFunction = (args) =>
  actionWithAuthorization(args, async ({ request, params, profile }) => {
    const { data, error } = await generateStoreValidator.validate(
      await request.formData()
    );

    if (error) {
      return validationError(error);
    }

    const storeId = v4();
    const { global_position } = await organisation(params.id!).write({
      type: 'CreateStore',
      data: {
        id: storeId,
        name: data.name,
      },
    });

    return redirect(
      `/stores/${storeId}?c=${serializeCheckpoint({ global_position })}`
    );
  });
