import { Table } from '../../modules/design-system/table';
import { PrimaryButton } from '../../modules/design-system/primary-button';
import { EmptyEventStream } from '../../modules/playground/components/empty-state';
import { WriteEventSlider } from '../../modules/playground/components/write-event-slider';
import { useState } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';

type LoaderData = {
  store_id: string;
};

export const loader: LoaderFunction = ({ params }) =>
  json<LoaderData>({
    store_id: params.id!,
  });

export default function Playground() {
  const { store_id } = useLoaderData<LoaderData>();
  const [slider, setSlider] = useState<boolean>(false);
  const events = [];

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
              <Table.Header.Column>Stream</Table.Header.Column>
              <Table.Header.Column>Event Type</Table.Header.Column>
              <Table.Header.Column>??</Table.Header.Column>
              <Table.Header.Column />
            </Table.Header>
            <Table.Body></Table.Body>
          </Table>
        )}
      </div>
    </>
  );
}
