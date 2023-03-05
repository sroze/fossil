import {
  CheckpointAfterNMessages,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import { EventWritten, IEventStore } from 'event-store';
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
    store,
    new WithEventsCheckpointStore(store, 'ConsumerCheckpoint-api-v1'),
    new CheckpointAfterNMessages(1)
  );

  void subscription.subscribeCategory(
    'Subscription',
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
