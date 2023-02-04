import {MagnifyingGlassIcon} from "@heroicons/react/20/solid";
import {Menu, Transition} from "@headlessui/react";
import {ProfilePicture} from "../components/profile-picture";
import {Fragment} from "react";
import {classNames} from "../../remix-utils/front-end";
import {useLoaderData} from "@remix-run/react";
import {LoaderParamsWithAuthentication} from "../../identity-and-authorization/remix-utils.server";
import md5 from "md5";

const userNavigation = [
  { name: "Sign out", href: "/auth/logout" },
];

export function Navbar() {
  const { profile } = useLoaderData<LoaderParamsWithAuthentication>();

  const profilePictureUrl = profile.photos && profile.photos.length > 0
    ? profile.photos[0].value
    : (profile.emails ? `https://www.gravatar.com/avatar/${md5(
      profile.emails[0].value
    )}` : 'https://picsum.photos/id/27/40/40');

  return (
    <nav className="flex-shrink-0 bg-indigo-600">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Logo section */}
          <div className="flex items-center px-2 lg:px-0 xl:w-64">
            <div className="flex-shrink-0">
              <span>🪨</span>
            </div>
          </div>

          {/*<SearchBar />*/}

          {/* Links section */}
          <div className="hidden lg:block lg:w-80">
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
                    <ProfilePicture src={profilePictureUrl} />
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
                              active ? "bg-gray-100" : "",
                              "block px-4 py-2 text-sm text-gray-700"
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
  )
}
