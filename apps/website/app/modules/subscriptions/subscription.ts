import {
  CheckpointAfterNMessages,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import { EventInStore, EventWritten, IEventStore } from 'event-store';
import sql from 'sql-template-tag';
import { Pool } from 'pg';

export type AnySubscriptionEvent = SubscriptionCreated;
export type SubscriptionCreated = EventWritten<
  'SubscriptionCreated',
  {
    subscription_id: string;
    store_id: string;
    type: string;
    name: string;
  }
>;

export function main(pool: Pool, store: IEventStore, abortSignal: AbortSignal) {
  const subscription = new Subscription(
    new WithEventsCheckpointStore(store, 'ConsumerCheckpoint-api-v1'),
    new CheckpointAfterNMessages(1)
  );

  void subscription.subscribe<AnySubscriptionEvent>(
    (position, signal) =>
      store.readCategory<AnySubscriptionEvent>(
        'Subscription',
        position,
        signal
      ),
    (event: EventInStore) => event.global_position,
    async ({ data, type }) => {
      if (type === 'SubscriptionCreated') {
        await pool.query(
          sql`INSERT INTO subscriptions (subscription_id, store_id, name, type, status)
            VALUES (${data.subscription_id}, ${data.store_id}, ${data.name}, ${data.type}, 'idle')
            ON CONFLICT DO NOTHING`
        );
      }
    },
    abortSignal
  );
}
