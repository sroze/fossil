import { ActionFunction, json, redirect } from '@remix-run/node';
import { StoreService } from '../../modules/stores/service';
import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { zValidJsonAsString } from '../../modules/zod-forms/validators/json';
import { validationError } from 'remix-validated-form';
import { DateTime } from 'luxon';
import { JWK, JWS } from 'node-jose';
import { H2 } from '../../modules/design-system/h2';
import { useActionData } from '@remix-run/react';
import { generateToken } from '../../modules/security/token-generator.server';

// TODO: Support URI templates and `*`
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

export type GenerateTokenSuccessfulResponse = {
  token: any;
};

type FossilClaims = {
  exp: number;
  fossil: {
    read?: { streams: string[] };
    write?: { streams: string[]; topics?: string[] };
    metadata?: Record<string, string>;
  };
};

export const action: ActionFunction = async ({ params, request }) => {
  const store = await StoreService.resolve().load(params.id!);
  const { data, error } = await generateTokenValidator.validate(
    await request.formData()
  );
  if (error) {
    return validationError(error);
  }

  const key = store.state.jwks.find((key) => key.id === data.key_id);
  if (!key) {
    throw new Error(`Key was not found`);
  } else if (key.type !== 'hosted' || !key.private_key) {
    throw new Error(`Can only generate tokens for hosted keys.`);
  }

  const { read, write, metadata } = data;
  const claims: FossilClaims = {
    exp: DateTime.fromISO(data.exp).valueOf() / 1000,
    fossil: {
      read,
      write,
      metadata,
    },
  };

  return json<GenerateTokenSuccessfulResponse>({
    token: await generateToken(key.private_key, claims),
  });
};

export default function GeneratedToken() {
  const action = useActionData();

  return (
    <div>
      <H2>Yay!</H2>
      <pre>{JSON.stringify(action.token)}</pre>
    </div>
  );
}
