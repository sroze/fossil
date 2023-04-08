import { ActionFunction, redirect } from '@remix-run/node';
import { withZod } from '@remix-validated-form/with-zod';
import { validationError } from 'remix-validated-form';
import { z } from 'zod';
import { v4 } from 'uuid';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { store } from '~/modules/stores/service';

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

    const identifier = v4();
    await store(identifier).write({
      type: 'CreateStoreCommand',
      data: {
        ...data,
        id: identifier,
        owning_org_id: params.id!,
      },
    });

    return redirect(`/stores/${identifier}`);
  });
