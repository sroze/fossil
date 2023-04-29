import React, { ComponentProps, useState } from 'react';
import { ValidatedForm } from 'remix-validated-form';
import {
  CommandLineIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/solid';
import {
  CreatableSelectInput,
  SelectInput,
  TextAreaInput,
} from '../../zod-forms/components/input';
import { DateTime } from 'luxon';
import { SubmitButton } from '../../zod-forms/components/submit-button';
import { generateTokenValidator } from '../../../routes/stores.$id/security.generate-token';
import { useFetcher } from '@remix-run/react';
import { GenerateTokenResponse } from 'fossil-api-client';
import { CopyableText } from '~/modules/design-system/copyable-text';

const selectStreamOptions = {
  label: 'Streams',
  isMulti: true,
  placeholder: 'Examples: `Foo-123` or `Foo-*`',
  formatCreateLabel: (inputValue: string): string => {
    const separatorIndex = inputValue.indexOf('-*');
    if (separatorIndex !== -1) {
      return `Allow streams in category "${inputValue.substring(
        0,
        separatorIndex
      )}".`;
    }

    return `Allow stream "${inputValue}"`;
  },
  options: [{ value: '*', label: '* (all streams)' }],
};

const LabelledCheckbox: React.FC<{
  name: string;
  checked: boolean;
  onChange: () => void;
  label: React.ReactElement;
  description: string;
}> = ({ name, checked, onChange, label, description }) => (
  <div className="relative flex items-start">
    <div className="flex h-5 items-center">
      <input
        id={name}
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        checked={checked}
        onChange={onChange}
      />
    </div>
    <div className="ml-3 text-sm">
      <label htmlFor={name} className="font-medium text-gray-700">
        {label}
      </label>
      <p id="comments-description" className="text-gray-500">
        Allow users of the token to read from Fossil.
      </p>
    </div>
  </div>
);

export const GenerateToken: React.FC<{
  store_id: string;
  key_options?: ComponentProps<typeof SelectInput>['options'];
  key_id?: string;
}> = ({ store_id, key_options, key_id }) => {
  const writer = useFetcher<GenerateTokenResponse>();
  const [read, setRead] = useState<boolean>(false);
  const [write, setWrite] = useState<boolean>(false);
  const [management, setManagement] = useState<boolean>(false);

  if (writer.data) {
    return (
      <div>
        <p>The token has been successfully generated.</p>
        <CopyableText text={writer.data.token} />
      </div>
    );
  }

  return (
    <ValidatedForm
      validator={generateTokenValidator}
      method="post"
      action={`/stores/${store_id}/security/generate-token`}
      className="flex h-full flex-col"
      fetcher={writer}
    >
      {key_id ? (
        <input name="key_id" type="hidden" value={key_id} />
      ) : (
        <SelectInput
          name="key_id"
          label="Encryption key"
          options={key_options}
          required
        />
      )}
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 mt-4">
        Permissions
      </h3>
      <LabelledCheckbox
        name="read"
        checked={read}
        onChange={() => setRead(!read)}
        label={
          <>
            <EyeIcon className="inline-block h-4 w-4" /> Read
          </>
        }
        description="Allow users of the token to read from Fossil."
      />
      {read ? (
        <div className="ml-7 py-4">
          <CreatableSelectInput name="read.streams" {...selectStreamOptions} />
        </div>
      ) : null}
      <LabelledCheckbox
        name="write"
        checked={write}
        onChange={() => setWrite(!write)}
        label={
          <>
            <PencilIcon className="inline-block h-4 w-4" /> Write
          </>
        }
        description="Allow users of the token to write from Fossil."
      />
      {write ? (
        <div className="ml-7 py-4">
          <CreatableSelectInput name="write.streams" {...selectStreamOptions} />
        </div>
      ) : null}
      <LabelledCheckbox
        name="management"
        checked={management}
        onChange={() => setManagement(!management)}
        label={
          <>
            <CommandLineIcon className="inline-block h-4 w-4" /> Management
          </>
        }
        description="Add management permissions."
      />
      {management ? (
        <div className="ml-7 py-4">
          <CreatableSelectInput
            name="management"
            label="Capabilities"
            isMulti
            options={[
              { value: '*', label: '* (all permissions)' },
              { value: 'subscriptions', label: 'subscriptions' },
              { value: 'keys', label: 'keys' },
            ]}
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
          {
            value: DateTime.utc().plus({ year: 10 }).toISO(),
            label: '10 years',
          },
          { value: null, label: 'Never expires' },
        ]}
      />
      <TextAreaInput className="mb-5" name="metadata" label="Extra metadata" />
      <div>
        <SubmitButton>Generate</SubmitButton>
      </div>
    </ValidatedForm>
  );
};
