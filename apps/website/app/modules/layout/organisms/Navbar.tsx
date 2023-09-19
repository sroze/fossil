import { Menu, Transition } from '@headlessui/react';
import { ProfilePicture } from '../../design-system/profile-picture';
import { Fragment, PropsWithChildren } from 'react';
import { classNames } from '../../../utils/remix-front-end';
import { useLoaderData } from '@remix-run/react';
import { LoaderParamsWithAuthentication } from '../../identity-and-authorization/remix-utils.server';
import { profilePictureUrl } from '~/modules/identity-and-authorization/profile';

const userNavigation = [{ name: 'Sign out', href: '/auth/logout' }];

type Props = {
  breadcrumbItems?: { href: string; label: string }[];
};

export function Navbar({ breadcrumbItems = [] }: PropsWithChildren<Props>) {
  const { profile } = useLoaderData<LoaderParamsWithAuthentication>();

  return (
    <nav className="flex-shrink-0 bg-indigo-600">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <nav className="flex" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-4">
              <li>
                <a
                  href="/"
                  className="p-2 rounded-md bg-slate-100 hover:bg-slate-200"
                >
                  🪨
                </a>
              </li>
              {breadcrumbItems.map((item) => (
                <li key={item.href}>
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-gray-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                    </svg>
                    <a
                      href={item.href}
                      className="ml-4 text-sm font-medium text-gray-300 hover:text-white"
                    >
                      {item.label}
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          </nav>

          {/* Links section */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-end">
              <div className="flex">
                <a
                  href="#"
                  className="rounded-md px-3 py-2 text-sm font-medium text-indigo-200 hover:text-white"
                >
                  Documentation
                </a>
              </div>

              {/* Profile dropdown */}
              <Menu as="div" className="relative ml-4 flex-shrink-0">
                <div>
                  <Menu.Button className="flex rounded-full bg-indigo-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700">
                    <ProfilePicture src={profilePictureUrl(profile)} />
                  </Menu.Button>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {userNavigation.map((item) => (
                      <Menu.Item key={item.name}>
                        {({ active }) => (
                          <a
                            href={item.href}
                            className={classNames(
                              active ? 'bg-gray-100' : '',
                              'block px-4 py-2 text-sm text-gray-700'
                            )}
                          >
                            {item.name}
                          </a>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
