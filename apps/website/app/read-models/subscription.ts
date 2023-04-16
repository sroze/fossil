import { Subscription, WithEventsCheckpointStore } from 'subscription';
import { IEventStore, StreamName } from 'event-store';
import sql from 'sql-template-tag';
import { Pool } from 'pg';
import { AnySubscriptionEvent } from '~/modules/subscriptions/domain/events';

export async function main(
  pool: Pool,
  store: IEventStore,
  abortSignal: AbortSignal
) {
  const subscription = new Subscription(
    store,
    { category: 'Subscription' },
    {
      checkpointStore: new WithEventsCheckpointStore(
        store,
        'WebsiteSubscriptionsReadModel-v2'
      ),
    }
  );

  await subscription.start<AnySubscriptionEvent>(
    async ({ data, type, stream_name }) => {
      const { identifier } = StreamName.decompose(stream_name);

      if (type === 'SubscriptionCreated') {
        await pool.query(
          sql`INSERT INTO subscriptions (subscription_id, store_id, name, category, status)
            VALUES (${identifier}, ${data.store_id}, ${data.name}, ${data.category}, 'creating')
            ON CONFLICT DO NOTHING`
        );
      } else if (type === 'SQSQueueCreated') {
        await pool.query(
          sql`UPDATE subscriptions SET status = 'ready' WHERE subscription_id = ${identifier}`
        );
      } else if (type === 'SubscriptionDeleted') {
        await pool.query(
          sql`DELETE FROM subscriptions WHERE subscription_id = ${identifier}`
        );
      }
    },
    abortSignal
  );
}
