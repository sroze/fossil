import React from 'react';
import { useFetcher } from '@remix-run/react';
import { FormInput, SelectInput } from '~/modules/zod-forms/components/input';
import { ValidatedForm } from 'remix-validated-form';
import { SubmitButton } from '~/modules/zod-forms/components/submit-button';
import { createSubscriptionValidator } from '~/routes/stores.$id/subscriptions';

export const NewSubscriptionForm: React.FC<{ store_id: string }> = ({
  store_id,
}) => {
  const writer = useFetcher<any>();

  return (
    <ValidatedForm
      validator={createSubscriptionValidator}
      method="post"
      action={`/stores/${store_id}/subscriptions`}
      fetcher={writer}
      className="flex h-full flex-col"
    >
      <FormInput className="mb-5" name="name" label="Name" required />

      <SelectInput
        name="type"
        label="Type"
        options={[{ value: 'poll', label: 'Polling' }]}
        required
      />

      <div>
        <SubmitButton>Generate</SubmitButton>
      </div>
    </ValidatedForm>
  );
};
