import React from 'react';
import { classNames } from '~/utils/remix-front-end';

export const SubscriptionStatusBadge: React.FC<{
  status: string;
}> = ({ status }) => {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        status === 'creating'
          ? 'bg-yellow-100  text-yellow-800'
          : 'bg-green-100  text-green-800'
      )}
    >
      <svg
        className={classNames(
          'mr-1.5 h-2 w-2',
          status === 'creating' ? 'text-yellow-400' : 'text-green-400'
        )}
        fill="currentColor"
        viewBox="0 0 8 8"
      >
        <circle cx={4} cy={4} r={3} />
      </svg>
      {status}
    </span>
  );
};
