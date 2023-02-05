import { useFetcher } from '@remix-run/react';
import { ValidatedForm } from 'remix-validated-form';
import React from 'react';
import { FormInput } from '../../zod-forms/input';
import { SubmitButton } from '../../zod-forms/submit-button';
import {
  generateKeyValidator,
  SuccessfulGenerateKeyResponse,
} from '../../../routes/api.stores.$id/keys.generate';
import { PrimaryButton, SecondaryButton } from '../../design-system/buttons';
import { LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { RadioFieldset } from '../../zod-forms/radio-fieldset';

function downloadFile(file: File) {
  // Create a link and set the URL using `createObjectURL`
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = URL.createObjectURL(file);
  link.download = file.name;

  // It needs to be added to the DOM so it can be clicked
  document.body.appendChild(link);
  link.click();

  // To make this work on Firefox we need to wait
  // a little while before removing it.
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.parentNode?.removeChild(link);
  }, 0);
}

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
