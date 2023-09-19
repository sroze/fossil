import React from 'react';

export const Card: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="col-span-1 flex flex-col">
    <div className="group flex flex-col border-l-4 border-indigo-600 p-3 md:border-l-0 md:border-t-4 bg-gray-200">
      <span className="text-sm font-medium text-indigo-600 group-hover:text-indigo-800">
        {title}
      </span>
      <span className="text-sm font-medium">{subtitle}</span>
    </div>

    <div className="p-5 bg-white">{children}</div>
  </div>
);
