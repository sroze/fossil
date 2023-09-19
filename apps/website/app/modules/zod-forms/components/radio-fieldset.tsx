import React from 'react';
import { useField } from 'remix-validated-form';
import { FormComponentWithError } from '~/modules/zod-forms/components/input';
import { Fieldset } from '~/modules/design-system/fieldset';

export const RadioFieldset: React.FC<{
  name: string;
  label?: string;
  options: {
    value: string;
    label: string | React.ReactElement;
    disabled?: boolean;
    description?: string;
  }[];
}> = ({ name, label, options }) => {
  const { getInputProps } = useField(name);

  return (
    <Fieldset label={label}>
      {options.map((option) => (
        <Fieldset.Option
          description={option.description}
          key={option.value}
          {...getInputProps({
            id: `${name}-${option.value}`,
            type: 'radio',
            value: option.value,
            label: option.label,
            disabled: option.disabled,
          })}
        />
      ))}
      <FormComponentWithError name={name} />
    </Fieldset>
  );
};
