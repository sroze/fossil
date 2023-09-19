import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

type Props = {
  title: string;
  cta: string;
  onCta: () => void;
};

export const SuccessModal: React.FC<Props> = ({
  title,
  children,
  cta,
  onCta,
}) => (
  <>
    <div>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
      </div>
      <div className="mt-3 text-center sm:mt-5">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          {title}
        </h3>
        <div className="mt-2">{children}</div>
      </div>
    </div>
    <div className="mt-5 sm:mt-6">
      <button
        type="button"
        className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={onCta}
      >
        {cta}
      </button>
    </div>
  </>
);
