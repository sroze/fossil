import React from 'react';
import { Column } from './table.header.column';

type HeaderType = React.FC & {
  Column: typeof Column;
};

export const Header: HeaderType = ({ children }) => (
  <thead className="bg-gray-50">{children}</thead>
);

Header.Column = Column;
