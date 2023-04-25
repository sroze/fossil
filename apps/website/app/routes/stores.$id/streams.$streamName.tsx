import { json, LoaderFunction } from '@remix-run/node';
import { EventsStream } from '../../modules/playground/components/events-stream';
import { useLoaderData } from '@remix-run/react';
import { H2 } from '../../modules/design-system/h2';
import { generatePlaygroundToken } from '~/modules/playground/backend/token-generator';

type LoaderData = {
  store_id: string;
  stream_name: string;
  token: string;
};

export const loader: LoaderFunction = async ({ params }) => {
  return json<LoaderData>({
    store_id: params.id!,
    stream_name: params.streamName!,
    token: await generatePlaygroundToken(params.id!),
  });
};

export default function Stream() {
  const { store_id, stream_name, token } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <H2>Stream "{stream_name}"</H2>

      <EventsStream
        token={token}
        uri={`/stores/${store_id}/streams/${encodeURIComponent(
          stream_name
        )}/sse-stream`}
      />
    </div>
  );
}
