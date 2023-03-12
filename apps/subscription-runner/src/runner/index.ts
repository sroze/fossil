import { IEventStore, StreamName } from 'event-store';
import {
  CheckpointAfterNMessages,
  InMemoryCheckpointStore,
  Subscription,
} from 'subscription';
import { Supervisor } from './supervisor';
import { AnySubscriptionEvent } from '../domain/events';

export async function main(store: IEventStore, abortSignal: AbortSignal) {
  const subscription = new Subscription(
    store,
    // We don't want to store checkpoints really, every single time the supervisor is
    // starting, we want it to reconsume the overall state.
    new InMemoryCheckpointStore(),
    new CheckpointAfterNMessages(1)
  );

  const supervisor = new Supervisor();
  await subscription.subscribeCategory<AnySubscriptionEvent>(
    'Subscription',
    {
      onMessage: async ({ data, type, stream_name }) => {
        const { identifier } = StreamName.decompose(stream_name);

        if (type === 'SubscriptionReady') {
          await supervisor.addSubscription({
            subscription_id: identifier,
            ...data,
          });
        }
      },
      onEOF: async () => {
        await supervisor.start();
      },
    },
    abortSignal
  );

  await supervisor.end();
}
