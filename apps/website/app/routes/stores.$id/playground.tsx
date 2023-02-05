import { Table } from '../../modules/design-system/table';
import { PrimaryButton } from '../../modules/design-system/primary-button';
import { EmptyEventStream } from '../../modules/playground/components/empty-state';
import { WriteEventSlider } from '../../modules/playground/components/write-event-slider';
import { useState } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import { useSubscription } from '../../modules/playground/hooks/useSubscription';
import { EventsTable } from '../../modules/playground/components/events-table';
import { EventsStream } from '../../modules/playground/components/events-stream';
import { EventOverTheWire } from '../../modules/subscriptions/server-sent-events/wire';

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

        <h2 className="text-lg font-medium text-gray-900">Live event stream</h2>
        <div>
          Below will appear past (last 100 events) and recent events in
          descending order (i.e. latest first).
        </div>

        <EventsStream uri={`/api/stores/${store_id}/subscribe`} />
      </div>
    </>
  );
}
