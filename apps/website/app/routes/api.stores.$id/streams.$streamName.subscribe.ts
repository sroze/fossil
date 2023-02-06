import { LoaderFunction } from '@remix-run/node';
import {
  Subscription,
  InMemoryCheckpointStore,
  CheckpointAfterNMessages,
} from 'subscription';
import { subscriptionAsEventStream } from '../../modules/subscriptions/server-sent-events/subscription';
import { storeForIdentifier } from '../../modules/stores/factory';
import type { EventInStore } from 'event-store';

export const loader: LoaderFunction = ({ request, params }) => {
  const store = storeForIdentifier(params.id!);

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
