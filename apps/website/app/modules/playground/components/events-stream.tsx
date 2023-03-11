import React, { useEffect, useState } from 'react';
import { EmptyEventStream } from './empty-state';
import { EventsTable } from './events-table';
import { useSubscription } from '../hooks/useSubscription';
import type { EventOverTheWire } from 'event-serialization';
import { cookieHandshake } from '~/modules/api-client/write';

// TODO: Add loading and error handling
const Stream: React.FC<{ uri: string }> = ({ uri }) => {
  const events = useSubscription<EventOverTheWire>(uri);

  return events.length === 0 ? (
    <EmptyEventStream />
  ) : (
    <EventsTable events={events} />
  );
};

export const EventsStream: React.FC<{ uri: string; token: string }> = ({
  uri,
  token,
}) => {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // As part of using the EventSource without polyfills or work around, we
  // need to pass the token through a cookie because browsers' `EventSource`
  // does not support giving `authorization` headers.
  useEffect(() => {
    (async () => {
      try {
        await cookieHandshake(token);
        setLoading(false);
      } catch (e) {
        setError(e as Error);
      }
    })();
  }, [token]);

  if (isLoading) {
    return <em>Loading...</em>;
  } else if (error) {
    return <em>Something went wrong preparing the interface</em>;
  }

  return <Stream uri={'http://localhost:3001' + uri} />;
};
