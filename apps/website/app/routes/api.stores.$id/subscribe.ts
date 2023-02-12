import { LoaderFunction } from '@remix-run/node';
import {
  Subscription,
  InMemoryCheckpointStore,
  CheckpointAfterNMessages,
} from 'subscription';
import { subscriptionAsEventStream } from '../../modules/subscriptions/server-sent-events/subscription';
import type { EventInStore } from 'event-store';
import { locator } from '~/modules/stores/locator';
import { DefaultCategory } from 'store-locator';

export const loader: LoaderFunction = async ({ request, params }) => {
  const store = await locator.locate(params.id!);

  // We create an ephemeral subscription.
  const manager = new Subscription(
    new InMemoryCheckpointStore(),
    new CheckpointAfterNMessages(1)
  );

  // Expose it as an event stream.
  return subscriptionAsEventStream(
    manager,
    (position, signal) => store.readCategory(DefaultCategory, position, signal),
    (event: EventInStore) => event.global_position,
    request.signal
  );
};
