import React from 'react';

export const Column: React.FC = ({ children }) => (
  <td className="whitespace-nowrap py-3 pl-3 pr-3 text-sm text-gray-900 sm:pl-6">
    {children}
  </td>
);
