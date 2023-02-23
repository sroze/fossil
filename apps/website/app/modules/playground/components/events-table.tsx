import { Table } from '../../design-system/table';
import React from 'react';
import { EventOverTheWire } from '../../../../../../packages/event-serialization/src';

export const EventsTable: React.FC<{ events: EventOverTheWire[] }> = ({
  events,
}) => (
  <Table>
    <Table.Header>
      <tr>
        <Table.Header.Column>#</Table.Header.Column>
        <Table.Header.Column>Time</Table.Header.Column>
        <Table.Header.Column>Stream</Table.Header.Column>
        <Table.Header.Column>Position</Table.Header.Column>
        <Table.Header.Column>Type</Table.Header.Column>
        <Table.Header.Column>Payload</Table.Header.Column>
      </tr>
    </Table.Header>
    <Table.Body>
      {events.map((event, i) => (
        <tr key={event.id}>
          <Table.Column>{event.id}</Table.Column>
          <Table.Column>{event.time}</Table.Column>
          <Table.Column>{event.stream_name}</Table.Column>
          <Table.Column>{event.position}</Table.Column>
          <Table.Column>{event.type}</Table.Column>
          <Table.Column>{event.data}</Table.Column>
        </tr>
      ))}
    </Table.Body>
  </Table>
);
