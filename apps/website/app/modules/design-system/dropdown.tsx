import React, { Fragment, Children, ReactChild, ReactElement } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { classNames } from '~/utils/remix-front-end';

export const DropDown: React.FC<{ label: string }> & { Item: typeof Item } = ({
  label,
  children,
}) => (
  <Menu as="div" className="relative inline-block text-left">
    <div>
      <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
        {label}
        <ChevronDownIcon
          className="-mr-1 h-5 w-5 text-gray-400"
          aria-hidden="true"
        />
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
      <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="py-1">
          {Children.map(Children.toArray(children), (child, index) => {
            const props =
              typeof child === 'object' && 'props' in child ? child.props : {};

            return (
              <Menu.Item key={index}>
                {({ active }) => (
                  <div
                    className={classNames(
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      'block px-4 py-2 text-sm cursor-pointer',
                      props.className
                    )}
                    onClick={() => props.onClick && props.onClick()}
                  >
                    {child}
                  </div>
                )}
              </Menu.Item>
            );
          })}
        </div>
      </Menu.Items>
    </Transition>
  </Menu>
);

const Item: React.FC<{ onClick?: () => void; className?: string }> = ({
  children,
  onClick,
}) => {
  return children as ReactElement;
};

DropDown.Item = Item;
