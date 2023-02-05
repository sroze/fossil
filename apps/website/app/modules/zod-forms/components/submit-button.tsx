import React from 'react';
import { useIsSubmitting } from 'remix-validated-form';
import { classNames } from '../../remix-utils/front-end';

export const SubmitButton: React.FC<{
  loadingLabel?: string;
}> = ({ loadingLabel, children }) => {
  const isSubmitting = useIsSubmitting();

  return (
    <button
      type="submit"
      className={classNames(
        'inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
        isSubmitting
          ? 'text-white bg-indigo-900 hover:bg-indigo-900'
          : 'text-white bg-indigo-600 hover:bg-indigo-700'
      )}
      disabled={isSubmitting}
    >
      {isSubmitting && loadingLabel ? loadingLabel : children}
    </button>
  );
};
