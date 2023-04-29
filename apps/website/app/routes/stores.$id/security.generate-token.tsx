import { ActionFunction, json, LoaderFunction } from '@remix-run/node';
import { getAuthenticatedStoreApi } from '../../modules/stores/service';
import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { zValidJsonAsString } from '../../modules/zod-forms/validators/json';
import { validationError } from 'remix-validated-form';
import { DateTime } from 'luxon';
import { H2 } from '../../modules/design-system/h2';
import { useActionData, useLoaderData } from '@remix-run/react';
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
    management: z
      .preprocess(
        (value) => (typeof value === 'string' ? [value] : value),
        z.array(z.enum(['subscriptions', 'keys', '*']))
      )
      .optional(),
    exp: z.string().datetime(),
    metadata: zValidJsonAsString.optional(),
  })
);

type ActionData = { token: string };
type LoaderData = { store_id: string };

export const loader: LoaderFunction = async ({ params }) => {
  return json<LoaderData>({
    store_id: params.id!,
  });
};

export const action: ActionFunction = async ({ params, request }) => {
  const store_id = params.id!;
  const { data, error } = await generateTokenValidator.validate(
    await request.formData()
  );
  if (error) {
    return validationError(error);
  }

  const api = await getAuthenticatedStoreApi(store_id);
  const {
    data: { token },
  } = await api.generateToken(store_id, {
    key_id: data.key_id,
    exp: DateTime.fromISO(data.exp).valueOf() / 1000,
    claims: {
      read: data.read,
      write: data.write,
      management: data.management,
    },
  });

  return json<ActionData>({
    token,
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
