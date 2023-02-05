import { DataFunctionArgs, json } from '@remix-run/node';
import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { storeForIdentifier } from '../../modules/stores/factory';
import { zValidJsonAsString } from '../../modules/zod-forms/validators/json';

export const writeEventValidator = withZod(
  z.object({
    stream: z.string().min(1),
    type: z.string().min(1),
    data: zValidJsonAsString,
    expected_version: z
      .string()
      .regex(/^-?[0-9]*$/)
      .optional(),
  })
);

export type SuccessfulWriteResponse = {
  position: string;
  global_position: string;
};

export async function action({ request, params }: DataFunctionArgs) {
  const { data, error } = await writeEventValidator.validate(
    await request.formData()
  );

  if (error) {
    return json(error, 400);
  }

  // For the MVP, we use the exact same store...
  const appendResult = await storeForIdentifier(params.id!).appendEvents(
    data.stream,
    [
      {
        type: data.type,
        data: data.data,
      },
    ],
    data.expected_version ? BigInt(data.expected_version) : null
  );

  return json<SuccessfulWriteResponse>({
    position: appendResult.position.toString(),
    global_position: appendResult.global_position.toString(),
  });
}
