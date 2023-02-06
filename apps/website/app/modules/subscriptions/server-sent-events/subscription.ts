import { eventStream } from 'remix-utils';
import { serializeEventInStoreForWire } from './wire';
import { PositionResolver, StreamFetcher, Subscription } from 'subscription';

// FIXME: Add the event ID so it supports recovering from network errors...
// TODO: Add "caught-up" events to know you are at the end.
// TODO: Add "deletion" events when a stream has been deleted.
export function subscriptionAsEventStream(
  subscription: Subscription,
  fetcher: StreamFetcher,
  positionResolver: PositionResolver,
  signal: AbortSignal
): Response {
  return eventStream(signal, function (send) {
    void subscription.subscribe(
      fetcher,
      positionResolver,
      async (event) => {
        send({
          event: 'event',
          data: JSON.stringify(serializeEventInStoreForWire(event)),
        });

        return Promise.resolve();
      },
      signal
    );

    return function clear() {
      // Nothing to close, everything should be done through the request signat.
    };
  });
}
