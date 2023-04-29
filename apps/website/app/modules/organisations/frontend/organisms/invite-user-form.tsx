import React from 'react';
import { useFetcher } from '@remix-run/react';
import { FormInput } from '~/modules/zod-forms/components/input';
import { SubmitButton } from '~/modules/zod-forms/components/submit-button';
import {
  inviteUserValidator,
  SuccessfullyInvitedUserResponse,
} from '~/routes/api/orgs.$id/invite';
import { ValidatedForm } from 'remix-validated-form';
import { RadioFieldset } from '~/modules/zod-forms/components/radio-fieldset';
import { SuccessModal } from '~/modules/design-system/success-modal';
import { CopyableText } from '~/modules/design-system/copyable-text';

export const InviteUserForm: React.FC<{
  org_id: string;
  onClose: () => void;
}> = ({ org_id, onClose }) => {
  const writer = useFetcher<SuccessfullyInvitedUserResponse>();

  if (writer.data) {
    return (
      <SuccessModal title="User invited" cta={'Close'} onCta={onClose}>
        <p className="text-sm text-gray-500 mb-3">
          User "{writer.data.invited_email}" has been invited. Send them the
          following link for them to accept the invitation:
        </p>
        <CopyableText text={writer.data.invitation_accept_url} />
      </SuccessModal>
    );
  }

  return (
    <ValidatedForm
      validator={inviteUserValidator}
      method="post"
      action={`/api/orgs/${org_id}/invite`}
      fetcher={writer}
      className="flex h-full flex-col"
    >
      <FormInput className="mb-5" name="email" label="Email" required />
      <RadioFieldset
        label="Role"
        name="role"
        options={[
          { value: 'admin', label: 'Admin' },
          { value: 'member', label: 'Member' },
        ]}
      />

      <div>
        <SubmitButton>Invite</SubmitButton>
      </div>
    </ValidatedForm>
  );
};
