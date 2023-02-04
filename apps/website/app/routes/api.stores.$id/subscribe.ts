import { LoaderFunction } from '@remix-run/node';
import { loaderWithAuthorization } from '../../modules/identity-and-authorization/remix-utils.server';

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization(args, async ({ params }) => {
    // FIXME: TODO expose a Event stream!
    return {};
  });
