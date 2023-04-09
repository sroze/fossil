import { AppendEventForm } from '../../modules/playground/components/append-event-form';
import { useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { EventsStream } from '../../modules/playground/components/events-stream';
import { H2 } from '../../modules/design-system/h2';
import { GenerateToken } from '../../modules/security/organisms/generate-token';
import { LoaderFunctionArgs } from '@remix-run/router';
import { StoreService } from '../../modules/stores/service';
import { NoHostedKey } from '../../modules/playground/components/empty-state';
import { ButtonAndPopup } from '../../modules/design-system/button-and-popup';
import { generatePlaygroundToken } from '~/modules/playground/backend/token-generator';
import { SectionHeader } from '~/modules/design-system/section-header';

export type KeySummary = { id: string; name: string };

type LoaderData = {
  store_id: string;
  token: any;
  hosted_keys: KeySummary[];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const store_id = params.id!;
  const store = await StoreService.resolve().load(store_id);

  return json<LoaderData>({
    store_id,
    token: await generatePlaygroundToken(params.id!),
    hosted_keys: store.jwks
      .filter((key) => key.type === 'hosted')
      .map(({ key_id, name }) => ({
        id: key_id,
        name,
      })),
  });
}

export default function Playground() {
  const { store_id, token, hosted_keys } = useLoaderData<LoaderData>();

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
        )}/subscribe`}
      />

      <H2>Generate a token</H2>
      <div>To write events programmatically, generate a token.</div>

      <ButtonAndPopup title="Generate a token">
        {hosted_keys.length > 0 ? (
          <GenerateToken
            store_id={store_id}
            key_options={hosted_keys.map((key) => ({
              value: key.id,
              label: key.name,
            }))}
          />
        ) : (
          <NoHostedKey store_id={store_id} />
        )}
      </ButtonAndPopup>
    </div>
  );
}
