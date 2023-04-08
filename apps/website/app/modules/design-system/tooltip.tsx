import React from 'react';
import { classNames } from '~/modules/remix-utils/front-end';

export const Tooltip: React.FC<{ message: string; className?: string }> = ({
  message,
  className,
  children,
}) => {
  return (
    <span className={classNames('relative group', className || '')}>
      {children}
      <div className="absolute bottom-0 right-0 left-0 flex flex-col items-center hidden mb-6 group-hover:flex">
        <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
          {message}
        </span>
        <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-600"></div>
      </div>
    </span>
  );
};
