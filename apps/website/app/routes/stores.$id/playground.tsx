import { PrimaryButton } from '../../modules/design-system/buttons';
import { WriteEventSlider } from '../../modules/playground/components/write-event-slider';
import { useState } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import { EventsStream } from '../../modules/playground/components/events-stream';
import { H2 } from '../../modules/design-system/h2';

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

        <H2>Live event stream</H2>
        <div>
          Below will appear past (last 100 events) and recent events in
          descending order (i.e. latest first).
        </div>

        <EventsStream uri={`/api/stores/${store_id}/subscribe`} />
      </div>
    </>
  );
}
