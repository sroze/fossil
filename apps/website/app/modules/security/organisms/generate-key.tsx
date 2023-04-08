import { useFetcher } from '@remix-run/react';
import { ValidatedForm } from 'remix-validated-form';
import React from 'react';
import { FormInput } from '../../zod-forms/components/input';
import { SubmitButton } from '../../zod-forms/components/submit-button';
import {
  generateKeyValidator,
  SuccessfulGenerateKeyResponse,
} from '../../../routes/api/stores.$id/keys.generate';
import { PrimaryButton } from '../../design-system/buttons';
import { LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { RadioFieldset } from '../../zod-forms/components/radio-fieldset';
import { downloadFile } from '../utils/react';

export const GenerateKeyForm: React.FC<{
  store_id: string;
}> = ({ store_id }) => {
  const writer = useFetcher<SuccessfulGenerateKeyResponse>();

  if (writer.data) {
    return (
      <div>
        The key has been successfully generated. The public key has been stored
        on Fossil, while the private key should remain yours.
        <PrimaryButton
          onClick={() => {
            downloadFile(
              new File([JSON.stringify(writer.data!.private)], 'key.json')
            );
          }}
        >
          Download key
        </PrimaryButton>
      </div>
    );
  }

  return (
    <ValidatedForm
      validator={generateKeyValidator}
      method="post"
      action={`/api/stores/${store_id}/keys/generate`}
      fetcher={writer}
      className="flex h-full flex-col"
    >
      <FormInput className="mb-5" name="name" label="Name" required />

      <RadioFieldset
        name="type"
        label="Type"
        options={[
          {
            value: 'private',
            label: (
              <>
                <LockClosedIcon className="text-gray-600 w-4 h-4 inline-block" />{' '}
                Stored by you
              </>
            ),
            description:
              'Only the public key remains in Fossil, you keep the private key. This is the most secure.',
          },
          {
            value: 'hosted',
            label: (
              <>
                <ShieldCheckIcon className="text-green-600 w-4 h-4 inline-block" />{' '}
                A copy is stored in Fossil
              </>
            ),
            description:
              'The private key is kept in Fossil, allowing you to use it on the playground and manually generate tokens.',
          },
        ]}
      />

      <div>
        <SubmitButton>Generate</SubmitButton>
      </div>
    </ValidatedForm>
  );
};
