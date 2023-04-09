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
import { pool } from '~/config.backend';
import sql from 'sql-template-tag';

type LoaderData = {
  org_id: string;
  org_name: string;
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization<LoaderData>(args, async ({ params, profile }) => {
    const org_id = params.id!;
    const {
      rows: [data],
    } = await pool.query<{ org_id: string; org_name: string }>(
      sql`SELECT o.org_id, o.name as org_name
          FROM users_in_orgs uio
          INNER JOIN orgs o ON o.org_id = uio.org_id
          WHERE uio.org_id = ${org_id} AND uio.user_id = ${profile.id}`
    );

    if (!data) {
      throw new Response('Not found', { status: 404 });
    }

    return data;
  });

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
