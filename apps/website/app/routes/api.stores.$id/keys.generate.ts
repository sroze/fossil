import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { DataFunctionArgs, json } from '@remix-run/node';
import { generateKey } from 'store-security';
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

  const key = await generateKey();
  await StoreService.resolve().write(params.id!, [
    {
      type: 'KeyGenerated',
      data: {
        store_id: params.id!,
        key_id: v4(),
        name: data.name,
        type: data.type,
        public_key: key.public,
        private_key: data.type === 'hosted' ? key.private : undefined,
      },
    },
  ]);

  return json<SuccessfulGenerateKeyResponse>(key);
}
