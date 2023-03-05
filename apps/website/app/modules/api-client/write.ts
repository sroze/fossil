import { z } from 'zod';
import { zValidJsonAsString } from '~/modules/zod-forms/validators/json';

export const streamNameSchema = z
  .string()
  .regex(
    /^([a-z0-9_]+)-([a-z0-9_-]+)$/i,
    `Stream must be prefixed by a category and a "-". Example: 'Foo-123'`
  )
  .min(1);

export const expectedVersionSchema = z
  .string()
  .regex(/^-?[0-9]*$/)
  .optional();

const appendEventSchema = z.object({
  stream: streamNameSchema,
  expected_version: expectedVersionSchema,
  events: z.array(
    z.object({
      type: z.string().min(1),
      data: zValidJsonAsString,
    })
  ),
});

export type SuccessfulWriteResponse = {
  position: string;
  global_position: string;
};

const storeIdFromToken = (token: string) =>
  JSON.parse(atob(token.split('.')[1])).fossil.store_id;

export function appendEvent(
  token: string,
  request: z.infer<typeof appendEventSchema>
): Promise<SuccessfulWriteResponse> {
  return fetch(
    `http://localhost:3001/stores/${storeIdFromToken(token)}/events`,
    {
      method: 'post',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  )
    .then((response) => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }

      throw new Error(`Something went wrong.`);
    })
    .then((response) => response.json());
}
