import React from 'react';
import { useField } from 'remix-validated-form';

export const RadioFieldset: React.FC<{
  name: string;
  options: { value: string; label: React.ReactElement; description: string }[];
}> = ({ name, options }) => {
  const { error, getInputProps } = useField(name);

  return (
    <fieldset className="mb-4">
      <legend className="text-sm font-medium text-gray-900">Type</legend>
      <div className="mt-2 space-y-5">
        {options.map((option) => (
          <div className="relative flex items-start" key={option.value}>
            <div className="absolute flex h-5 items-center">
              <input
                {...getInputProps({
                  id: `${name}-${option.value}`,
                  type: 'radio',
                  className:
                    'h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500',
                  value: option.value,
                })}
              />
            </div>
            <div className="pl-7 text-sm">
              <label
                htmlFor={`${name}-${option.value}`}
                className="font-medium text-gray-900"
              >
                {option.label}
              </label>
              <p className="text-gray-500">{option.description}</p>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
};
