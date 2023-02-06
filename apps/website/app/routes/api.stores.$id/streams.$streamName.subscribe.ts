import { LoaderFunction } from '@remix-run/node';
import { SubscriptionManager } from '../../modules/subscriptions/subscription-manager';
import { InMemoryCheckpointStore } from '../../modules/subscriptions/checkpoint-store/in-memory';
import { CheckpointAfterNMessages } from '../../modules/subscriptions/checkpoint-strategy/message-count';
import { subscriptionAsEventStream } from '../../modules/subscriptions/server-sent-events/subscription';
import { storeForIdentifier } from '../../modules/stores/factory';
import type { EventInStore } from 'event-store';

export const loader: LoaderFunction = ({ request, params }) => {
  const store = storeForIdentifier(params.id!);

  // We create an ephemeral subscription.
  const manager = new SubscriptionManager(
    new InMemoryCheckpointStore(),
    new CheckpointAfterNMessages(1)
  );

  // Expose it as an event stream.
  return subscriptionAsEventStream(
    manager,
    (position, signal) =>
      store.readStream(params.streamName!, position, signal),
    // FIXME: There is something off with this position -- we need an ADR to clarify what we expect.
    (event: EventInStore) => event.position + 1n,
    request.signal
  );
};
