import React from 'react';
import { classNames } from '~/utils/remix-front-end';

export const Fieldset: React.FC<{ label?: string }> & {
  Option: typeof Option;
} = ({ children, label }) => {
  return (
    <fieldset className="mb-4">
      {label ? (
        <legend className="text-sm font-medium text-gray-900">{label}</legend>
      ) : null}
      <div className="mt-2 space-y-5">{children}</div>
    </fieldset>
  );
};

export const Option: React.FC<
  {
    value: string;
    name: string;
    label: string | React.ReactElement;
    description?: string;
    disabled?: boolean;
  } & React.InputHTMLAttributes<HTMLInputElement>
> = ({ value, label, description, name, disabled, children, ...rest }) => {
  return (
    <div className="relative flex items-start">
      <div className="absolute flex h-5 items-center">
        <input
          className={classNames(
            'h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500'
          )}
          name={name}
          disabled={disabled}
          value={value}
          {...rest}
        />
      </div>
      <div className="pl-7 text-sm">
        <label
          htmlFor={`${name}-${value}`}
          className="font-medium text-gray-900"
        >
          {label}
        </label>
        {description ? <p className="text-gray-500">{description}</p> : null}
      </div>
    </div>
  );
};

Fieldset.Option = Option;
