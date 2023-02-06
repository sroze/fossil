import {
  EventInStore,
  EventWritten,
  MessageDbClient,
  MessageDbStore,
} from 'event-store';
import { Pool } from 'pg';
import sql from 'sql-template-tag';
import {
  CheckpointAfterNMessages,
  InMemoryCheckpointStore,
  Subscription,
} from 'subscription';

require('dotenv').config();

const abortController = new AbortController();

process.on('SIGINT', () => abortController.abort());
process.on('SIGTERM', () => abortController.abort());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10,
  connectionTimeoutMillis: 10000,
  statement_timeout: 60000,
});

export const store = new MessageDbStore(new MessageDbClient(pool));

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

(async () => {
  const subscription = new Subscription(
    new InMemoryCheckpointStore(),
    new CheckpointAfterNMessages(1)
  );

  void subscription.subscribe<AnySubscriptionEvent>(
    (position, signal) => store.readCategory('Subscription', position, signal),
    (event: EventInStore) => event.global_position,
    async ({ data }) => {
      await pool.query(
        sql`INSERT INTO subscriptions (subscription_id, store_id, name, type, status)
            VALUES (${data.subscription_id}, ${data.store_id}, ${data.name}, ${data.type}, 'idle')
            ON CONFLICT DO NOTHING`
      );
    },
    abortController.signal
  );
})();

export {};
