import { LoaderFunction } from '@remix-run/node';
import { eventStream } from 'remix-utils';
import { SubscriptionManager } from '../../modules/subscriptions/subscription-manager';
import { fossilEventStore } from '../../modules/event-store/store.backend';
import { InMemoryCheckpointStore } from '../../modules/subscriptions/checkpoint-store/in-memory';
import { CheckpointAfterNMessages } from '../../modules/subscriptions/checkpoint-strategy/message-count';
import { EventInStore } from '../../modules/event-store/interfaces';

export type EventOverTheWire = Omit<
  EventInStore,
  'position' | 'global_position' | 'time'
> & {
  time: string;
  position: string;
  global_position: string;
};

const serializeEventInStore = ({
  position,
  global_position,
  time,
  ...rest
}: EventInStore): EventOverTheWire => ({
  ...rest,
  time: time.toISOString(),
  position: position.toString(),
  global_position: global_position.toString(),
});

export const loader: LoaderFunction = ({ request }) => {
  // FIXME: Add the event ID so it supports recovering from network errors...
  // TODO: Add "caught-up" events to know you are at the end.

  return eventStream(request.signal, function (send) {
    const manager = new SubscriptionManager(
      fossilEventStore,
      new InMemoryCheckpointStore(),
      new CheckpointAfterNMessages(1)
    );

    void manager.subscribe(
      'Bar', // TODO: Make it work better!
      async (event) => {
        send({
          event: 'event',
          data: JSON.stringify(serializeEventInStore(event)),
        });

        return Promise.resolve();
      },
      request.signal
    );

    return function clear() {
      // Nothing to close, everything should be done through the request signat.
    };
  });
};
