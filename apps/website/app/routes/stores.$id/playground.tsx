import { PrimaryButton } from '../../modules/design-system/buttons';
import { AppendEventForm } from '../../modules/playground/components/append-event-form';
import { useState } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import { EventsStream } from '../../modules/playground/components/events-stream';
import { H2 } from '../../modules/design-system/h2';
import { GenerateToken } from '../../modules/security/organisms/generate-token';
import { LoaderFunctionArgs } from '@remix-run/router';
import { StoreService } from '../../modules/stores/service';
import { NoHostedKey } from '../../modules/playground/components/empty-state';
import { ButtonAndPopup } from '../../modules/design-system/button-and-popup';
import { StoreState } from '~/modules/stores/decider';
import { generatePlaygroundToken } from '~/modules/playground/backend/token-generator';

export type KeySummary = { id: string; name: string };

type LoaderData = {
  store: StoreState;
  token: any;
  hosted_keys: KeySummary[];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const store = await StoreService.resolve().load(params.id!);

  return json<LoaderData>({
    store,
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
  const { store, token, hosted_keys } = useLoaderData<LoaderData>();

  return (
    <div className="pt-5">
      <div className="float-right">
        <ButtonAndPopup title="Write an event" variant="primary">
          <AppendEventForm token={token} />
        </ButtonAndPopup>
      </div>

      <H2>Live event stream</H2>
      <div>
        Below will appear past (last 100 events) and recent events in descending
        order (i.e. latest first).
      </div>

      <EventsStream
        token={token}
        uri={`/stores/${store.id}/categories/${encodeURIComponent(
          '*'
        )}/subscribe`}
      />

      <H2>Generate a token</H2>
      <div>To write events programmatically, generate a token.</div>

      <ButtonAndPopup title="Generate a token">
        {hosted_keys.length > 0 ? (
          <GenerateToken
            store_id={store.id}
            key_options={hosted_keys.map((key) => ({
              value: key.id,
              label: key.name,
            }))}
          />
        ) : (
          <NoHostedKey store_id={store.id} />
        )}
      </ButtonAndPopup>
    </div>
  );
}
