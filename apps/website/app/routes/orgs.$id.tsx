import { LoaderFunction } from '@remix-run/node';
import { Outlet, useLoaderData, useLocation } from '@remix-run/react';
import {
  CubeTransparentIcon,
  UsersIcon,
  BanknotesIcon,
} from '@heroicons/react/24/solid';
import { loaderWithAuthorization } from '../modules/identity-and-authorization/remix-utils.server';
import { Navbar } from '../modules/layout/organisms/Navbar';
import { Nav } from '~/modules/design-system/nav';
import { assertPermissionOnOrg } from '~/utils/security';
import { deserializeCheckpoint, waitFor } from '~/utils/eventual-consistency';
import { factory } from '~/read-models/orgs';
import { fossilEventStore, pool } from '~/config.backend';

type LoaderData = {
  org_id: string;
  org_name: string;
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization<LoaderData>(
    args,
    async ({ params, profile, request }) => {
      const url = new URL(request.url);
      if (url.searchParams.has('c')) {
        const checkpoint = deserializeCheckpoint(url.searchParams.get('c')!);

        if ('global_position' in checkpoint) {
          await waitFor(
            factory(fossilEventStore, pool).checkpointStore,
            checkpoint.global_position,
            5000
          );
        }
      }

      return assertPermissionOnOrg(params.id!, profile.id);
    }
  );

export default function Store() {
  const { org_name, org_id } = useLoaderData<LoaderData>();
  const currentLocation = useLocation();

  const navigation = [
    { name: 'Stores', href: `/orgs/${org_id}`, icon: CubeTransparentIcon },
    {
      name: 'People',
      href: `/orgs/${org_id}/people`,
      icon: UsersIcon,
    },
    {
      name: 'Billing',
      href: `/orgs/${org_id}/billing`,
      icon: BanknotesIcon,
    },
  ].map((item) => ({
    ...item,
    current: currentLocation.pathname === item.href,
  }));

  return (
    <div className="relative flex min-h-full flex-col bg-gray-100">
      <Navbar
        breadcrumbItems={[{ label: org_name, href: `/orgs/${org_id}` }]}
      />

      <div className="flex flex-row">
        <div className="w-64">
          <Nav>
            {navigation.map((item) => (
              <Nav.Item
                key={item.href}
                label={item.name}
                href={item.href}
                active={item.current}
                icon={item.icon}
              />
            ))}
          </Nav>
        </div>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
