import React from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/20/solid';
import { ValidatedForm } from 'remix-validated-form';
import { FormInput, TextAreaInput } from '../../zod-forms/components/input';
import { SubmitButton } from '../../zod-forms/components/submit-button';
import {
  client,
  expectedVersionSchema,
  streamNameSchema,
} from '~/modules/api-client/write';
import { mutationAsFetcher } from '~/modules/zod-forms/fetcher';
import { z } from 'zod';
import { zValidJsonAsString } from '~/modules/zod-forms/validators/json';
import { withZod } from '@remix-validated-form/with-zod';

const validator = withZod(
  z.object({
    stream: streamNameSchema,
    type: z.string().min(1),
    data: zValidJsonAsString,
    expected_version: expectedVersionSchema,
  })
);

export const AppendEventForm: React.FC<{
  token: string;
}> = ({ token }) => {
  const writer = mutationAsFetcher(async (form: FormData) => {
    const { error, data } = await validator.validate(Object.fromEntries(form));
    if (error) {
      throw error;
    }

    return client.appendEvent(token, {
      stream: data.stream,
      expected_version: data.expected_version,
      events: [
        {
          type: data.type,
          data: JSON.parse(data.data),
        },
      ],
    });
  });

  return (
    <ValidatedForm
      validator={validator}
      fetcher={writer}
      className="flex h-full flex-col"
    >
      <FormInput
        className="mb-5"
        name="stream"
        label="Stream"
        placeholder="Foo-123"
        required
      />
      <FormInput
        className="mb-5"
        name="type"
        label="Event Type"
        placeholder="FirstEventType"
        required
      />
      <TextAreaInput className="mb-5" name="data" label="Payload" required />
      <FormInput
        className="mb-5"
        name="expected_version"
        label="Expected version"
        type="number"
      />
      <div className="mt-4 flex text-sm">
        <a
          href="#"
          className="group inline-flex items-center text-gray-500 hover:text-gray-900"
        >
          <QuestionMarkCircleIcon
            className="h-5 w-5 text-gray-400 group-hover:text-gray-500"
            aria-hidden="true"
          />
          <span className="ml-2">Learn more about writing events.</span>
        </a>
      </div>

      <div className="py-4">
        {writer.data ? (
          writer.data instanceof Error ? (
            <div className="pt-2 text-red-700 flex-1 text-sm">
              {writer.data.message}
            </div>
          ) : (
            <div className="pt-2 text-green-700 flex-1 text-sm">
              ✔️ Wrote event at position {writer.data.position}
            </div>
          )
        ) : null}
      </div>

      <div>
        <SubmitButton>Write</SubmitButton>
      </div>
    </ValidatedForm>
  );
};
