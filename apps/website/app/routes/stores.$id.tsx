import { LoaderFunction } from '@remix-run/node';
import { Outlet, useLoaderData, useLocation } from '@remix-run/react';
import {
  FireIcon,
  HomeIcon,
  InboxStackIcon,
  LockClosedIcon,
  QueueListIcon,
} from '@heroicons/react/24/solid';
import { loaderWithAuthorization } from '../modules/identity-and-authorization/remix-utils.server';
import { Navbar } from '../modules/layout/organisms/Navbar';
import { Nav } from '~/modules/design-system/nav';
import { pool } from '~/config.backend';
import sql from 'sql-template-tag';

type LoaderData = {
  store_id: string;
  store_name: string;
  org_id: string;
  org_name: string;
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization<LoaderData>(args, async ({ params }) => {
    const store_id = params.id!;
    const {
      rows: [data],
    } = await pool.query<LoaderData>(
      sql`SELECT s.store_id, s.name as store_name, o.org_id, o.name as org_name
          FROM stores s
          INNER JOIN orgs o ON o.org_id = s.org_id
          WHERE store_id = ${store_id}`
    );

    return data;
  });

export default function Store() {
  const { store_id, store_name, org_id, org_name } =
    useLoaderData<LoaderData>();
  const currentLocation = useLocation();

  const navigation = [
    { name: 'Overview', href: `/stores/${store_id}`, icon: HomeIcon },
    {
      name: 'Streams',
      href: `/stores/${store_id}/streams`,
      icon: QueueListIcon,
    },
    {
      name: 'Durable subscriptions',
      href: `/stores/${store_id}/subscriptions`,
      icon: InboxStackIcon,
    },
    {
      name: 'Security',
      href: `/stores/${store_id}/security`,
      icon: LockClosedIcon,
    },
    {
      name: 'Playground',
      href: `/stores/${store_id}/playground`,
      icon: FireIcon,
    },
  ].map((item) => ({
    ...item,
    current: currentLocation.pathname === item.href,
  }));

  return (
    <div className="relative flex min-h-full flex-col bg-gray-100">
      <Navbar
        breadcrumbItems={[
          { label: org_name, href: `/orgs/${org_id}` },
          { label: store_name, href: `/stores/${store_id}` },
        ]}
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
