import { DataFunctionArgs, json } from '@remix-run/node';
import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';

function isJsonString(string: string) {
  try {
    JSON.parse(string);
  } catch (e) {
    return false;
  }

  return true;
}

export const writeEventValidator = withZod(
  z.object({
    stream: z.string().min(1),
    type: z.string().min(1),
    data: z.custom<{ arg: string }>(
      (arg) => (typeof arg === 'string' ? isJsonString(arg) : false),
      { message: 'Must be a valid JSON object.' }
    ),
    expected_version: z.preprocess((val) => {
      if (typeof val === 'string') {
        return val === '' ? undefined : parseInt(val, 10);
      }

      return val;
    }, z.number().optional()),
  })
);

export async function action({ request }: DataFunctionArgs) {
  const { data, error } = await writeEventValidator.validate(
    await request.formData()
  );

  if (error) {
    return json(error, 400);
  }

  // FIXME: todo.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return json({
    data,
  });
}
