import { Table } from '../../modules/design-system/table';
import { PrimaryButton } from '../../modules/design-system/primary-button';
import { EmptyEventStream } from '../../modules/playground/components/empty-state';
import { WriteEventSlider } from '../../modules/playground/components/write-event-slider';
import { useState } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import { useSubscription } from '../../modules/playground/hooks/useSubscription';
import type { EventOverTheWire } from '../api.stores.$id/subscribe';

type LoaderData = {
  store_id: string;
};

export const loader: LoaderFunction = ({ params }) =>
  json<LoaderData>({
    store_id: params.id!,
  });

export default function Playground() {
  const { store_id } = useLoaderData<LoaderData>();
  const events = useSubscription<EventOverTheWire>(
    `/api/stores/${store_id}/subscribe`
  );
  const [slider, setSlider] = useState<boolean>(false);

  return (
    <>
      <WriteEventSlider
        open={slider}
        onClose={() => setSlider(false)}
        storeId={store_id}
      />

      <div className="pt-5">
        <div className="float-right">
          <PrimaryButton onClick={() => setSlider(true)}>
            Write an event
          </PrimaryButton>
        </div>

        <h2 id="summary-heading" className="text-lg font-medium text-gray-900">
          Live event stream
        </h2>
        <div>
          Below will appear past (last 100 events) and recent events in
          descending order (i.e. latest first).
        </div>

        {events.length === 0 ? (
          <EmptyEventStream />
        ) : (
          <Table>
            <Table.Header>
              <Table.Header.Column>#</Table.Header.Column>
              <Table.Header.Column>Time</Table.Header.Column>
              <Table.Header.Column>Stream</Table.Header.Column>
              <Table.Header.Column>Position</Table.Header.Column>
              <Table.Header.Column>Type</Table.Header.Column>
              <Table.Header.Column>Payload</Table.Header.Column>
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
        )}
      </div>
    </>
  );
}
