import React from 'react';
import { Header } from './table.header';
import { Body } from './table.body';
import { Column } from './table.column';

type TableType = React.FC & {
  Header: typeof Header;
  Body: typeof Body;
  Column: typeof Column;
};

export const Table: TableType = ({ children }) => (
  <div className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg my-4 overflow-auto">
    <table className="min-w-full divide-y divide-gray-300">{children}</table>
  </div>
);

Table.Header = Header;
Table.Body = Body;
Table.Column = Column;
