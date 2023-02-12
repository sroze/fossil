import { LoaderFunction } from '@remix-run/node';
import {
  Subscription,
  InMemoryCheckpointStore,
  CheckpointAfterNMessages,
} from 'subscription';
import { subscriptionAsEventStream } from '../../modules/subscriptions/server-sent-events/subscription';
import type { EventInStore } from 'event-store';
import { locator } from '~/modules/stores/locator';

export const loader: LoaderFunction = async ({ request, params }) => {
  const store = await locator.locate(params.id!);

  // We create an ephemeral subscription.
  const subscription = new Subscription(
    new InMemoryCheckpointStore(),
    new CheckpointAfterNMessages(1)
  );

  // Expose it as an event stream.
  return subscriptionAsEventStream(
    subscription,
    (position, signal) =>
      store.readStream(params.streamName!, position, signal),
    // FIXME: There is something off with this position -- we need an ADR to clarify what we expect.
    (event: EventInStore) => event.position + 1n,
    request.signal
  );
};
