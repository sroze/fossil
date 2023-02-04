import { ActionFunction } from '@remix-run/node';
import { authenticator } from '../../modules/identity-and-authorization/authenticator.server';

export let loader: ActionFunction = async ({ request }) => {
  await authenticator.logout(request, { redirectTo: '/auth/login' });
};
