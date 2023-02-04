import { classNames } from '../remix-utils/front-end';
import React from 'react';

export const PrimaryButton: React.FC<{ className?: string }> = ({
  children,
  className,
}) => (
  <button
    type="submit"
    className={classNames(
      'mt-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
      className
    )}
  >
    {children}
  </button>
);
