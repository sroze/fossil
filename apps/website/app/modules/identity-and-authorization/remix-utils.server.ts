import { DataFunctionArgs, json } from '@remix-run/node';
import { authenticationIsEnabled, authenticator } from './authenticator.server';
import type { Auth0Profile } from 'remix-auth-auth0';
import {
  Profile,
  profileFromOAuthProfile,
} from '~/modules/identity-and-authorization/profile';

export type LoaderParamsWithAuthentication = {
  profile: Profile;
};

export async function loaderWithAuthorization<ReturnType extends object = any>(
  args: DataFunctionArgs,
  loader?: (
    args: DataFunctionArgs & { profile: Profile }
  ) => Promise<ReturnType | Response>
): Promise<(ReturnType & LoaderParamsWithAuthentication) | Response> {
  const profile: Profile = authenticationIsEnabled()
    ? profileFromOAuthProfile(
        await authenticator.isAuthenticated(args.request, {
          failureRedirect: '/auth/login',
        })
      )
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

export async function actionWithAuthorization<ReturnType extends object = any>(
  args: DataFunctionArgs,
  action: (
    args: DataFunctionArgs & { profile: Profile }
  ) => Promise<Response> | Response | Promise<ReturnType> | ReturnType
) {
  const profile: Profile = authenticationIsEnabled()
    ? profileFromOAuthProfile(
        await authenticator.isAuthenticated(args.request, {
          failureRedirect: '/auth/login',
        })
      )
    : developmentProfile;

  const response = await action({ ...args, profile });
  if (response instanceof Response) {
    return response;
  }

  return json(response);
}

const developmentProfile: Profile = {
  id: '00000000-0000-0000-0000-000000000000',
  displayName: 'Developer',
  email: 'engineer@example.com',
};
