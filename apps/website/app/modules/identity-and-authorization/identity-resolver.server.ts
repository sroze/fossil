import { ManagementClient } from 'auth0';
import { Profile } from '~/modules/identity-and-authorization/profile';

let auth0 = new ManagementClient({
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  domain: process.env.AUTH0_DOMAIN!,
  scope: 'read:users update:users',
});

export async function profileFromUserIdentifier(id: string): Promise<Profile> {
  const user = await auth0.getUser({ id });
  if (!user) {
    throw new Error('User not found');
  } else if (!user.email) {
    throw new Error('User does not have an email address');
  }

  return {
    id,
    displayName: user.given_name || user.name || user.email,
    email: user.email,
  };
}
