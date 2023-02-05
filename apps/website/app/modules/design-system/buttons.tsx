import { classNames } from '../remix-utils/front-end';
import React from 'react';

export const buttonClassNames = (): string =>
  'inline-flex items-center rounded-md border font-medium  shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2';

export const sizeClassNames = (size: 'small' | 'medium'): string =>
  size === 'small' ? 'mr-2 px-2.5 py-1.5 text-xs' : 'mr-3 py-2 px-4 text-sm';

export const colorSchemeClassNames = (
  scheme: 'primary' | 'secondary'
): string =>
  scheme === 'primary'
    ? 'border-transparent bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-indigo-500';

export const PrimaryButton: React.FC<{
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}> = ({ children, type, className, onClick }) => (
  <button
    type={type || 'button'}
    onClick={onClick}
    className={classNames(
      buttonClassNames(),
      sizeClassNames('medium'),
      colorSchemeClassNames('primary'),
      className
    )}
  >
    {children}
  </button>
);

export const SecondaryButton: React.FC<{ onClick?: () => void }> = ({
  children,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={classNames(
      buttonClassNames(),
      sizeClassNames('medium'),
      colorSchemeClassNames('secondary')
    )}
  >
    {children}
  </button>
);
