import React, { ComponentProps, FC } from 'react';
import { useField } from 'remix-validated-form';
import { ExclamationCircleIcon } from '@heroicons/react/20/solid';
import { classNames } from '../../remix-utils/front-end';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';

type LabelledFormProps = {
  name: string;
  className?: string;
  label: string;
  optional?: boolean;
};
export const LabelledFormComponent: React.FC<LabelledFormProps> = ({
  className,
  name,
  children,
  optional,
  label,
}) => (
  <div className={className}>
    <div className="flex justify-between">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {optional && <span className="text-sm text-gray-500">Optional</span>}
    </div>
    {children}
  </div>
);

export const FormComponentWithError: React.FC<{ name: string }> = ({
  name,
  children,
}) => {
  const { error } = useField(name);

  return (
    <>
      <div className="mt-1 relative flex rounded-md shadow-sm">
        {children}
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </>
  );
};

export const FormInput: FC<
  LabelledFormProps & JSX.IntrinsicElements['input']
> = ({ label, name, optional, className, onChange, ...rest }) => {
  const { error, getInputProps } = useField(name);

  return (
    <LabelledFormComponent
      label={label}
      name={name}
      optional={optional}
      className={className}
    >
      <FormComponentWithError name={name}>
        <input
          {...getInputProps({
            onChange,
            id: name,
            type: 'text',
            className: classNames(
              'border focus:ring-teal-500 focus:border-teal-500 focus:z-10 block w-full sm:text-sm text-black pr-10',
              'rounded-md p-2',
              error &&
                'border-red-800 bg-red-50 text-red-800 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
            ),
            ...rest,
          })}
        />
      </FormComponentWithError>
    </LabelledFormComponent>
  );
};

export const TextAreaInput: FC<
  LabelledFormProps & JSX.IntrinsicElements['textarea']
> = ({ label, name, optional, className, onChange, ...rest }) => {
  const { error, getInputProps } = useField(name);

  return (
    <LabelledFormComponent
      label={label}
      name={name}
      optional={optional}
      className={className}
    >
      <FormComponentWithError name={name}>
        <textarea
          {...getInputProps({
            onChange,
            id: name,
            className: classNames(
              'border focus:ring-teal-500 focus:border-teal-500 focus:z-10 block w-full sm:text-sm text-black pr-10',
              'rounded-md p-2',
              error &&
                'border-red-800 bg-red-50 text-red-800 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
            ),
            ...rest,
          })}
        />
      </FormComponentWithError>
    </LabelledFormComponent>
  );
};

export const SelectInput: React.FC<
  LabelledFormProps & ComponentProps<Select>
> = ({ label, name, optional, className, ...rest }) => {
  const { getInputProps } = useField(name);

  return (
    <LabelledFormComponent
      label={label}
      name={name}
      optional={optional}
      className={className}
    >
      <FormComponentWithError name={name}>
        <div className="flex-1">
          <Select {...rest} {...getInputProps()} />
        </div>
      </FormComponentWithError>
    </LabelledFormComponent>
  );
};

export const CreatableSelectInput: React.FC<
  LabelledFormProps & ComponentProps<CreatableSelect>
> = ({ label, name, optional, className, ...rest }) => {
  const { getInputProps } = useField(name);

  return (
    <LabelledFormComponent
      label={label}
      name={name}
      optional={optional}
      className={className}
    >
      <FormComponentWithError name={name}>
        <div className="flex-1">
          <CreatableSelect {...rest} {...getInputProps()} />
        </div>
      </FormComponentWithError>
    </LabelledFormComponent>
  );
};
