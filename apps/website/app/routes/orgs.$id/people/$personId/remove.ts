import { ActionFunction, redirect } from '@remix-run/node';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { organisation } from '~/modules/organisations/service';

export const action: ActionFunction = (args) =>
  actionWithAuthorization(args, async ({ params }) => {
    await organisation(params.id!).write({
      type: 'RemoveMember',
      data: { user_id: params.personId! },
    });

    return redirect(`/orgs/${params.id!}/people`);
  });
