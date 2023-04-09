import { DataFunctionArgs, json } from '@remix-run/node';
import { authenticator } from './authenticator.server';
import {
  Profile,
  profileFromOAuthProfile,
} from '~/modules/identity-and-authorization/profile';

export type LoaderParamsWithAuthentication = {
  profile: Profile;
};

export async function profileFromRequest(request: Request): Promise<Profile> {
  return profileFromOAuthProfile(
    await authenticator.isAuthenticated(request, {
      failureRedirect: '/auth/login',
    })
  );
}

export async function loaderWithAuthorization<ReturnType extends object = any>(
  args: DataFunctionArgs,
  loader?: (
    args: DataFunctionArgs & { profile: Profile }
  ) => Promise<ReturnType | Response>
): Promise<(ReturnType & LoaderParamsWithAuthentication) | Response> {
  const profile = await profileFromRequest(args.request);

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
  const profile = await profileFromRequest(args.request);
  const response = await action({ ...args, profile });
  if (response instanceof Response) {
    return response;
  }

  return json(response);
}
