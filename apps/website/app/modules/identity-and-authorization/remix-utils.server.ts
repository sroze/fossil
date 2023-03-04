import { DataFunctionArgs, json } from '@remix-run/node';
import { authenticationIsEnabled, authenticator } from './authenticator.server';
import type { Auth0Profile } from 'remix-auth-auth0';

export type LoaderParamsWithAuthentication = {
  profile: Auth0Profile;
};

export async function loaderWithAuthorization<ReturnType extends object = any>(
  args: DataFunctionArgs,
  loader?: (
    args: DataFunctionArgs & { profile: Auth0Profile }
  ) => Promise<ReturnType | Response>
): Promise<(ReturnType & LoaderParamsWithAuthentication) | Response> {
  const profile: Auth0Profile = authenticationIsEnabled()
    ? await authenticator.isAuthenticated(args.request, {
        failureRedirect: '/auth/login',
      })
    : developmentProfile;

  if (loader) {
    const result: ReturnType | Response = await loader({ ...args, profile });
    if (result instanceof Response) {
      return result;
    }

    return json({
      ...result,
      profile,
    });
  }

  return json({ profile });
}

export function actionWithAuthorization(
  action: (
    args: DataFunctionArgs & { profile: Auth0Profile }
  ) => Promise<Response> | Response | Promise<any> | any
) {
  return async (args: DataFunctionArgs) => {
    const profile: Auth0Profile = authenticationIsEnabled()
      ? await authenticator.isAuthenticated(args.request, {
          failureRedirect: '/auth/login',
        })
      : developmentProfile;

    return action({ ...args, profile });
  };
}

const developmentProfile: Auth0Profile = {
  id: '00000000-0000-0000-0000-000000000000',
  name: { givenName: 'Software', familyName: 'Engineer' },
  displayName: 'Developer',
  emails: [{ value: 'engineer@example.com' }],
  photos: [
    {
      value: 'https://eu.ui-avatars.com/api/?name=Software+Engineer&size=250',
    },
  ],
  provider: 'auth0',
};
