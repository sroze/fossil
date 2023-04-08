import { LoaderFunction } from '@remix-run/node';
import { loaderWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';

export const loader: LoaderFunction = (args) => {
  return loaderWithAuthorization(args, async () => {
    // 1. If no org
    //    -> redirect to /orgs/new
    // 2. If single org.
    //    -> redirect to /orgs/:id
    // 3. If multiple orgs, display a selector.

    return {};
  });
};

export default function Orgs() {
  return <div>TODO</div>;
}
