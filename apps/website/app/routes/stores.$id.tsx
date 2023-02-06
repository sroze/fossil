import { LoaderFunction } from '@remix-run/node';
import { Outlet, useLoaderData, useLocation } from '@remix-run/react';
import {
  CircleStackIcon,
  FireIcon,
  HomeIcon,
  InboxStackIcon,
  LockClosedIcon,
  QueueListIcon,
} from '@heroicons/react/24/solid';
import { StoreState } from '../modules/stores/domain/store';
import { loaderWithAuthorization } from '../modules/identity-and-authorization/remix-utils.server';
import { StoreService } from '../modules/stores/service';
import { classNames } from '../modules/remix-utils/front-end';
import { Navbar } from '../modules/layout/organisms/Navbar';

type LoaderData = {
  store: StoreState;
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization(args, async ({ params }) => {
    const store = await StoreService.resolve().load(params.id!);

    return {
      store: store.state,
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
    // { name: 'Communities', href: '#', icon: UserGroupIcon, current: false },
    // { name: 'Trending', href: '#', icon: ArrowTrendingUpIcon, current: false },
  ].map((item) => ({
    ...item,
    current: currentLocation.pathname === item.href,
  }));

  return (
    <div className="relative flex min-h-full flex-col bg-gray-100">
      <Navbar />

      <div className="mx-auto max-w-3xl sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-12 lg:gap-8 lg:px-8">
        <div className="lg:col-span-3 lg:block md:w-64">
          <div className="flex flex-shrink-0 border-b border-grey-800 p-4 mb-5">
            <div className="group block w-full flex-shrink-0">
              <div className="flex items-center">
                <div>
                  <CircleStackIcon className="inline-block h-9 w-9 rounded-full text-orange-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{store.name}</p>
                  <p className="text-xs font-medium text-gray-400">
                    Professional
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 pb-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={classNames(
                  item.current
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50',
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md'
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                <item.icon
                  className={classNames(
                    item.current
                      ? 'text-gray-500'
                      : 'text-gray-400 group-hover:text-gray-500',
                    'flex-shrink-0 -ml-1 mr-3 h-6 w-6'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.name}</span>
              </a>
            ))}
          </div>
        </div>
        <main className="lg:col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
