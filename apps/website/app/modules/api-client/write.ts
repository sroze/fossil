import { z } from 'zod';
import { zValidJsonAsString } from '~/modules/zod-forms/validators/json';
import { storeApiBaseUrl } from '~/modules/api-client/config';
import { request } from '~/modules/http/request';

export const categorySchema = z
  .string()
  .regex(
    /^([a-z0-9_]+)/i,
    `Category must be a set of letters and numbers. Example: 'Foo'`
  )
  .min(1);

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

class ApiClient {
  constructor(private readonly baseUrl: string) {}

  cookieHandshake(token: string): Promise<void> {
    return request(
      `${this.baseUrl}/stores/${storeIdFromToken(token)}/cookie-handshake`,
      {
        method: 'post',
        headers: {
          authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      }
    );
  }

  appendEvent(
    token: string,
    body: z.infer<typeof appendEventSchema>
  ): Promise<SuccessfulWriteResponse> {
    return request(`${this.baseUrl}/stores/${storeIdFromToken(token)}/events`, {
      method: 'post',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }
}

export const client = new ApiClient(storeApiBaseUrl);
