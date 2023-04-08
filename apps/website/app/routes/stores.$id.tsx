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
import { StoreService } from '../modules/stores/service';
import { Navbar } from '../modules/layout/organisms/Navbar';
import { StoreState } from '~/modules/stores/decider';
import { Nav } from '~/modules/design-system/nav';

type LoaderData = {
  store: StoreState;
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization(args, async ({ params }) => {
    // TODO: Validate that the user has access to the store!
    const store = await StoreService.resolve().load(params.id!);

    return {
      store,
    };
  });

export default function Store() {
  const { store } = useLoaderData<LoaderData>();
  const currentLocation = useLocation();

  const navigation = [
    { name: 'Overview', href: `/stores/${store.id}`, icon: HomeIcon },
    {
      name: 'Streams',
      href: `/stores/${store.id}/streams`,
      icon: QueueListIcon,
    },
    {
      name: 'Durable subscriptions',
      href: `/stores/${store.id}/subscriptions`,
      icon: InboxStackIcon,
    },
    {
      name: 'Security',
      href: `/stores/${store.id}/security`,
      icon: LockClosedIcon,
    },
    {
      name: 'Playground',
      href: `/stores/${store.id}/playground`,
      icon: FireIcon,
    },
  ].map((item) => ({
    ...item,
    current: currentLocation.pathname === item.href,
  }));

  return (
    <div className="relative flex min-h-full flex-col bg-gray-100">
      <Navbar
        breadcrumbItems={[{ label: store.name, href: `/stores/${store.id}` }]}
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
