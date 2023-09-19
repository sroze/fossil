import { FormInput } from '~/modules/zod-forms/components/input';
import { SubmitButton } from '~/modules/zod-forms/components/submit-button';
import { ValidatedForm } from 'remix-validated-form';
import React from 'react';
import { generateStoreValidator } from '~/routes/orgs.$id/stores';

export const NewStoreForm: React.FC<{ org_id: string }> = ({ org_id }) => (
  <ValidatedForm
    validator={generateStoreValidator}
    method="post"
    action={`/orgs/${org_id}/stores`}
  >
    <FormInput className="mb-5" name="name" label="Name" />

    <SubmitButton>Create</SubmitButton>
  </ValidatedForm>
);
