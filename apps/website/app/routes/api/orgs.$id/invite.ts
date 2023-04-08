import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { ActionFunction, DataFunctionArgs, json } from '@remix-run/node';
import { invitation } from '~/modules/organisations/invitations/domain';
import { v4 } from 'uuid';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';

export type SuccessfullyInvitedUserResponse = {
  invitation_id: string;
  invited_email: string;
  invitation_accept_url: string;
};

export const inviteUserValidator = withZod(
  z.object({
    email: z.string().email(),
    role: z.enum(['member', 'admin']),
  })
);

export const action: ActionFunction = (args) =>
  actionWithAuthorization(args, async ({ request, params, profile }) => {
    const { data, error } = await inviteUserValidator.validate(
      await request.formData()
    );

    if (error) {
      return json(error, 400);
    }

    const invitation_id = v4();
    await invitation(invitation_id).write({
      type: 'CreateInviteCommand',
      data: {
        org_id: params.id!,
        invited_email: data.email,
        invited_role: data.role,
        invited_by: profile.id,
      },
    });

    const url = new URL(request.url);
    return json<SuccessfullyInvitedUserResponse>({
      invitation_id,
      invited_email: data.email,
      invitation_accept_url: `${url.protocol}//${url.host}/invitations/${invitation_id}/accept`,
    });
  });
