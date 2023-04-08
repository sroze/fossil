import {
  ActionFunction,
  json,
  LoaderFunction,
  redirect,
} from '@remix-run/node';
import {
  actionWithAuthorization,
  loaderWithAuthorization,
} from '~/modules/identity-and-authorization/remix-utils.server';
import {
  invitation,
  State as InvitationState,
} from '~/modules/organisations/invitations/domain';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { organisation } from '~/modules/organisations/service';
import { Profile } from '~/modules/identity-and-authorization/profile';
import { profileFromUserIdentifier } from '~/modules/identity-and-authorization/identity-resolver.server';
import { SuccessfullyAcceptedInviteResponse } from '~/routes/api/invitations.$id/accept';
import { mutationAsFetcher } from '~/modules/zod-forms/fetcher';
import React, { useEffect } from 'react';
import { classNames } from '~/modules/remix-utils/front-end';

type Props = {
  org_name: string;
  invite_id: string;
  invite: InvitationState;
  invitedBy: Profile;
  loggedInUser: Profile;
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization<Props>(
    args,
    async ({ params, profile: loggedInUser }) => {
      const invite_id = params.id!;
      const { state: invite } = await invitation(invite_id).read();
      if (!invite) {
        throw new Error(`Invite not found.`);
      }

      const { state: org } = await organisation(invite.org_id).read();
      if (!org) {
        throw new Error(`Organisation not found.`);
      }

      return {
        invite_id,
        org_name: org.name,
        invite,
        loggedInUser,
        invitedBy: await profileFromUserIdentifier(invite.invited_by),
      };
    }
  );

const AcceptInvitationForm: React.FC<{ invite_id: string }> = ({
  invite_id,
}) => {
  const writer = useFetcher<SuccessfullyAcceptedInviteResponse>();

  useEffect(() => {
    if (writer.state === 'idle' && writer.data?.org_version) {
      alert('TODO: redirect!');
    }
  }, [writer]);

  return (
    <writer.Form
      method="post"
      action={`/api/invitations/${invite_id}/accept`}
      className="mt-10 flex items-center justify-center gap-x-6"
    >
      <button
        type="submit"
        disabled={writer.state === 'loading'}
        className={classNames(
          'rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
          writer.state === 'loading' ? 'opacity-50' : ''
        )}
      >
        Accept the invite
      </button>

      <a href="/" className="text-sm font-semibold text-gray-900">
        Skip and discover <span aria-hidden="true">&rarr;</span>
      </a>
    </writer.Form>
  );
};

export default function Accept() {
  const { invite, loggedInUser, org_name, invitedBy, invite_id } =
    useLoaderData<Props>();

  return (
    <main className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base font-semibold text-indigo-600">
          Welcome on Fossil
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {invitedBy.displayName} invited you to{' '}
          <span className="px-2 bg-yellow-200">{org_name}</span>.
        </h1>

        {invite.status === 'accepted' ? (
          <p className="mt-6 text-base leading-7 text-orange-600">
            The invitation has already been accepted.
          </p>
        ) : loggedInUser.email !== invite.invited_email ? (
          <p className="mt-6 text-base leading-7 text-orange-600">
            Your email ({loggedInUser.email}) does not match the invitation.
          </p>
        ) : (
          <>
            <p className="mt-6 text-base leading-7 text-gray-600">
              Accept the invitation to use Fossil's event stores for this
              organisation.
            </p>
            <AcceptInvitationForm invite_id={invite_id} />
          </>
        )}
      </div>
    </main>
  );
}
