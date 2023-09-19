import React from 'react';

export const Checkbox: React.FC<{ name: string; value: string }> = ({
  name,
  value,
  children,
}) => (
  <div className="relative flex items-start mb-5">
    <div className="flex h-6 items-center">
      <input
        id={name}
        name={name}
        value={value}
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
      />
    </div>
    <div className="ml-3 text-sm leading-6">
      <label htmlFor={name}>{children}</label>
    </div>
  </div>
);
