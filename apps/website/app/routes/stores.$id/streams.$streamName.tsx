import { json, LoaderFunction } from '@remix-run/node';
import { EventsStream } from '../../modules/playground/components/events-stream';
import { useLoaderData } from '@remix-run/react';
import { H2 } from '../../modules/design-system/h2';

type LoaderData = {
  store_id: string;
  stream_name: string;
};

export const loader: LoaderFunction = ({ params }) => {
  return json<LoaderData>({
    store_id: params.id!,
    stream_name: params.streamName!,
  });
};

export default function Stream() {
  const { store_id, stream_name } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <H2>Stream "{stream_name}"</H2>

      <EventsStream
        uri={`/api/stores/${store_id}/streams/${encodeURIComponent(
          stream_name
        )}/subscribe`}
      />
    </div>
  );
}
