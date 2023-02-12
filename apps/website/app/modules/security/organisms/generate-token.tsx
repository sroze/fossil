import React, { ComponentProps, useState } from 'react';
import { ValidatedForm } from 'remix-validated-form';
import { EyeIcon, PencilIcon } from '@heroicons/react/24/solid';
import {
  CreatableSelectInput,
  SelectInput,
  TextAreaInput,
} from '../../zod-forms/components/input';
import { DateTime } from 'luxon';
import { SubmitButton } from '../../zod-forms/components/submit-button';
import { generateTokenValidator } from '../../../routes/stores.$id/security.generate-token';

export const GenerateToken: React.FC<{
  store_id: string;
  key_options: ComponentProps<typeof SelectInput>['options'];
}> = ({ store_id, key_options }) => {
  const [read, setRead] = useState<boolean>(false);
  const [write, setWrite] = useState<boolean>(false);

  return (
    <ValidatedForm
      validator={generateTokenValidator}
      method="post"
      action={`/stores/${store_id}/security/generate-token`}
      className="flex h-full flex-col"
    >
      <SelectInput
        name="key_id"
        label="Encryption key"
        options={key_options}
        required
      />

      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 mt-4">
        Permissions
      </h3>
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            id="read"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={read}
            onChange={() => setRead(!read)}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="read" className="font-medium text-gray-700">
            <EyeIcon className="inline-block h-4 w-4" /> Read
          </label>
          <p id="comments-description" className="text-gray-500">
            Allow users of the token to read from Fossil.
          </p>
        </div>
      </div>

      {read ? (
        <div className="ml-7 py-4">
          <CreatableSelectInput
            name="read.streams"
            label="Streams"
            isMulti
            options={[{ value: '*', label: '* (wildcard)' }]}
          />
        </div>
      ) : null}

      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            id="write"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={write}
            onChange={() => setWrite(!write)}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="write" className="font-medium text-gray-700">
            <PencilIcon className="inline-block h-4 w-4" /> Write
          </label>
          <p id="comments-description" className="text-gray-500">
            Allow users of the token to write from Fossil.
          </p>
        </div>
      </div>

      {write ? (
        <div className="ml-7 py-4">
          <CreatableSelectInput
            name="write.streams"
            label="Streams"
            isMulti
            options={[{ value: '*', label: 'Any (`*`)' }]}
          />
        </div>
      ) : null}

      <h3 className="text-lg font-medium leading-6 text-gray-900 mt-4">
        Metadata
      </h3>

      <SelectInput
        name="exp"
        label="Expiration"
        options={[
          { value: DateTime.utc().plus({ hour: 1 }).toISO(), label: '1 hour' },
          { value: DateTime.utc().plus({ day: 1 }).toISO(), label: '1 day' },
          { value: DateTime.utc().plus({ year: 1 }).toISO(), label: '1 year' },
        ]}
      />

      <TextAreaInput className="mb-5" name="metadata" label="Extra metadata" />

      <div>
        <SubmitButton>Generate</SubmitButton>
      </div>
    </ValidatedForm>
  );
};
