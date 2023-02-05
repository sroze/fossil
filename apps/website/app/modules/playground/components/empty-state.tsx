import { InboxIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import { classNames } from '../../remix-utils/front-end';
import {
  buttonClassNames,
  colorSchemeClassNames,
  sizeClassNames,
} from '../../design-system/buttons';
import React from 'react';

export const EmptyEventStream = () => (
  <div className="block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center mt-5 bg-white text-gray-600">
    <InboxIcon className="mx-auto h-10 w-10" />
    <span className="text-sm">
      There is nothing in there yet... Write an event!
    </span>
  </div>
);

export const NoHostedKey: React.FC<{ store_id: string }> = ({ store_id }) => (
  <div className="block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center mt-5 bg-white text-gray-600">
    <LockClosedIcon className="mx-auto h-10 w-10" />
    <div className="font-bold">No hosted key.</div>
    <div className="text-sm mb-5">
      It means we can't generate a token for you.
    </div>
    <a
      href={`/stores/${store_id}/security`}
      className={classNames(
        buttonClassNames(),
        sizeClassNames('small'),
        colorSchemeClassNames('secondary')
      )}
    >
      Go to security settings
    </a>
  </div>
);
