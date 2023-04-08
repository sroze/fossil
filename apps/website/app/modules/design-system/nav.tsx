import React, { PropsWithChildren } from 'react';
import { classNames } from '~/modules/remix-utils/front-end';

export const Nav: React.FC & {
  Item: React.FC<{ label: string; href: string; active: boolean; icon: any }>;
} = ({ children }) => <div className="space-y-1 p-4">{children}</div>;

Nav.Item = ({ label, href, active, icon: Icon }) => (
  <a
    key={label}
    href={href}
    className={classNames(
      active ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-50',
      'group flex items-center px-3 py-2 text-sm font-medium rounded-md'
    )}
    aria-current={active ? 'page' : undefined}
  >
    <Icon
      className={classNames(
        active ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
        'flex-shrink-0 -ml-1 mr-3 h-6 w-6'
      )}
      aria-hidden="true"
    />
    <span className="truncate">{label}</span>
  </a>
);
