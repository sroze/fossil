import { ActionFunction, json, redirect } from '@remix-run/node';
import { StoreService } from '../../modules/stores/service';
import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { zValidJsonAsString } from '../../modules/zod-forms/validators/json';
import { validationError } from 'remix-validated-form';
import { DateTime } from 'luxon';
import { H2 } from '../../modules/design-system/h2';
import { useActionData, useLoaderData } from '@remix-run/react';
import { generateToken } from '~/modules/security/security.backend';
import { storeApiBaseUrl } from '~/modules/api-client/config';

const streamTemplate = z.string().min(1);
const streamTemplateList = z.preprocess(
  (value) => (typeof value === 'string' ? [value] : value),
  z.array(streamTemplate).min(1)
);

export const generateTokenValidator = withZod(
  z.object({
    key_id: z.string(),
    read: z
      .object({
        streams: streamTemplateList,
      })
      .optional(),
    write: z
      .object({
        streams: streamTemplateList,
        types: z.array(z.string()).optional(),
      })
      .optional(),
    exp: z.string().datetime(),
    metadata: zValidJsonAsString.optional(),
  })
);

type ActionData = { token: string };
type LoaderData = { store_id: string };

export const loader = async ({ params }) => {
  await StoreService.resolve().load(params.id!);

  return json<LoaderData>({
    store_id: params.id!,
  });
};

export const action: ActionFunction = async ({ params, request }) => {
  const store = await StoreService.resolve().load(params.id!);
  const { data, error } = await generateTokenValidator.validate(
    await request.formData()
  );
  if (error) {
    return validationError(error);
  }

  const key = store.jwks.find((key) => key.key_id === data.key_id);
  if (!key) {
    throw new Error(`Key was not found`);
  } else if (key.type !== 'hosted' || !key.private_key) {
    throw new Error(`Can only generate tokens for hosted keys.`);
  }

  const { read, write, metadata } = data;
  const claims = {
    exp: DateTime.fromISO(data.exp).valueOf() / 1000,
    fossil: {
      store_id: store.id,
      read,
      write,
      metadata,
    },
  };

  return json<ActionData>({
    token: await generateToken(key.private_key, claims),
  });
};

export default function GeneratedToken() {
  const { store_id } = useLoaderData<LoaderData>();
  const action = useActionData<ActionData>();
  const token = action ? action.token : '{protected}';

  const body = {
    stream: 'Foo-123',
    events: [{ type: 'FirstType', data: { my_key: 123 } }],
  };
  const request = `curl ${storeApiBaseUrl}/stores/${store_id}/events \\
  -X POST \\
  -H 'authorization: Bearer ${token}' \\
  -H 'content-Type: application/json' \\
  --data '${JSON.stringify(body)}'`;

  return (
    <div className="pt-5">
      <H2>Token generated</H2>
      <p>
        Use it in the <code>Authorization</code> header for your HTTP requests.
      </p>
      <pre className="my-3">{token}</pre>

      <H2>Example: writing an event</H2>
      <pre>{request}</pre>
    </div>
  );
}
