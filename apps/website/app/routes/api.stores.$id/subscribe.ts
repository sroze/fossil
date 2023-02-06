import { LoaderFunction } from '@remix-run/node';
import { SubscriptionManager } from '../../modules/subscriptions/subscription-manager';
import { InMemoryCheckpointStore } from '../../modules/subscriptions/checkpoint-store/in-memory';
import { CheckpointAfterNMessages } from '../../modules/subscriptions/checkpoint-strategy/message-count';
import { subscriptionAsEventStream } from '../../modules/subscriptions/server-sent-events/subscription';
import { storeForIdentifier } from '../../modules/stores/factory';
import { UniqueCategory } from '../../modules/stores/single-category-store';
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
    (position, signal) => store.readCategory(UniqueCategory, position, signal),
    (event: EventInStore) => event.global_position,
    request.signal
  );
};
