import { PrimaryButton } from '../../modules/design-system/buttons';
import { WriteEventSlider } from '../../modules/playground/components/write-event-slider';
import { useState } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import { EventsStream } from '../../modules/playground/components/events-stream';
import { H2 } from '../../modules/design-system/h2';
import { GenerateToken } from '../../modules/security/organisms/generate-token';
import { LoaderFunctionArgs } from '@remix-run/router';
import { StoreService } from '../../modules/stores/service';
import { StoreState } from '../../modules/stores/domain/store';
import { NoHostedKey } from '../../modules/playground/components/empty-state';
import { ButtonAndPopup } from '../../modules/design-system/button-and-popup';

export type KeySummary = { id: string; name: string };

type LoaderData = {
  store: StoreState;
  hosted_keys: KeySummary[];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { state: store } = await StoreService.resolve().load(params.id!);

  return json<LoaderData>({
    store,
    hosted_keys: store.jwks
      .filter((key) => key.type === 'hosted')
      .map(({ id, name }) => ({
        id,
        name,
      })),
  });
}

export default function Playground() {
  const { store, hosted_keys } = useLoaderData<LoaderData>();
  const [slider, setSlider] = useState<boolean>(false);

  return (
    <>
      <WriteEventSlider
        open={slider}
        onClose={() => setSlider(false)}
        storeId={store.id}
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

        <EventsStream uri={`/api/stores/${store.id}/subscribe`} />

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
    </>
  );
}
