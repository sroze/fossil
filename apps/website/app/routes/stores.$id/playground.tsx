import { AppendEventForm } from '../../modules/playground/components/append-event-form';
import { useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { EventsStream } from '../../modules/playground/components/events-stream';
import { LoaderFunctionArgs } from '@remix-run/router';
import { ButtonAndPopup } from '../../modules/design-system/button-and-popup';
import { generatePlaygroundToken } from '~/modules/playground/backend/token-generator';
import { SectionHeader } from '~/modules/design-system/section-header';

type LoaderData = {
  store_id: string;
  token: any;
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const store_id = params.id!;

  return json<LoaderData>({
    store_id,
    token: await generatePlaygroundToken(store_id),
  });
}

export default function Playground() {
  const { store_id, token } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <SectionHeader
        title="Live event stream"
        subtitle="Below will appear past (last 100 events) and recent events in descending order (i.e. latest first)."
        right={
          <ButtonAndPopup title="Write an event" variant="primary">
            <AppendEventForm token={token} />
          </ButtonAndPopup>
        }
      />

      <EventsStream
        token={token}
        uri={`/stores/${store_id}/categories/${encodeURIComponent(
          '*'
        )}/sse-stream`}
      />
    </div>
  );
}
