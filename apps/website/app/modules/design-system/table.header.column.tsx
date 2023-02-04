import React from 'react';

export const Column: React.FC = ({ children }) => (
  <th
    scope="col"
    className="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:pl-6"
  >
    {children}
  </th>
);
