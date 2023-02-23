import React from 'react';
import { EmptyEventStream } from './empty-state';
import { EventsTable } from './events-table';
import { useSubscription } from '../hooks/useSubscription';
import { EventOverTheWire } from '../../../../../../packages/event-serialization/src';

// TODO: Add a loading state.
// TODO: Add error handling.
export const EventsStream: React.FC<{ uri: string }> = ({ uri }) => {
  const events = useSubscription<EventOverTheWire>(uri);

  return events.length === 0 ? (
    <EmptyEventStream />
  ) : (
    <EventsTable events={events} />
  );
};
