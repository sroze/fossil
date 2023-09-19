import { ActionFunction, redirect } from '@remix-run/node';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { DurableSubscriptionService } from '~/modules/subscriptions/service';

export const action: ActionFunction = (args) =>
  actionWithAuthorization(args, async ({ params, request }) => {
    // get submitted form data:
    const body = await request.formData();
    if (!body.has('confirm')) {
      throw new Error('The deletion was not confirmed.');
    }

    await DurableSubscriptionService.resolve().delete(params.subscriptionId!);

    return redirect(`/stores/${params.id}/subscriptions`);
  });
