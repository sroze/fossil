import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { DataFunctionArgs, json } from '@remix-run/node';
import { generateKey } from '../../modules/security/security.backend';
import { StoreService } from '../../modules/stores/service';
import { v4 } from 'uuid';

export const generateKeyValidator = withZod(
  z.object({
    name: z.string().min(1),
    type: z.enum(['private', 'hosted']),
  })
);

export type SuccessfulGenerateKeyResponse = Awaited<
  ReturnType<typeof generateKey>
>;

export async function action({ request, params }: DataFunctionArgs) {
  const { data, error } = await generateKeyValidator.validate(
    await request.formData()
  );

  if (error) {
    return json(error, 400);
  }

  const key = await StoreService.resolve().createKey(params.id!, data);

  return json<SuccessfulGenerateKeyResponse>(key);
}
