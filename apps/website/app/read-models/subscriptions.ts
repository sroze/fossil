import {
  MultiSubscriptions,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import { IEventStore, StreamName } from 'event-store';
import sql from 'sql-template-tag';
import { Pool } from 'pg';
import { RunnableSubscription } from '~/utils/subscription';
import { AnyOrganisationEvent } from '~/modules/organisations/events';

// FIXME: Generate these events from a schema exposed by the API.
//        In particular, the API should be able to generate an AsyncAPI document, which will
//        be used to generate the TypeScript types for the events.
// @see https://github.com/axway-streams/axway-amplify-streams-asyncapi/blob/master/asyncapi.yml
type AnySubscriptionOrSqsRelayEvent =
  | SubscriptionCreated
  | SubscriptionDeleted
  | SQSQueueCreated
  | SQSQueueRequestedEvent;

export type SubscriptionCreated = {
  type: 'SubscriptionCreated';
  data: {
    store_id: string;
    category: string;
    name: string;
  };
};

export type SubscriptionDeleted = {
  type: 'SubscriptionDeleted';
  data: {};
};

export type SQSQueueRequestedEvent = {
  type: 'SQSQueueRequested';
  data: object;
};

export type SQSQueueCreated = {
  type: 'SQSQueueCreated';
  data: {
    sqs_queue_url: string;
  };
};

export function factory(
  store: IEventStore,
  pool: Pool
): RunnableSubscription<AnySubscriptionOrSqsRelayEvent> {
  return {
    subscription: new MultiSubscriptions([
      new Subscription(
        store,
        { category: 'Subscription' },
        {
          checkpointStore: new WithEventsCheckpointStore(
            store,
            'WebsiteSubscriptionsReadModel-Subscription-v1'
          ),
        }
      ),
      new Subscription(
        store,
        { category: 'SqsRelay' },
        {
          checkpointStore: new WithEventsCheckpointStore(
            store,
            'WebsiteSubscriptionsReadModel-SqsRelay-v1'
          ),
        }
      ),
    ]),
    handler: async ({ data, type, stream_name }) => {
      const { identifier } = StreamName.decompose(stream_name);

      // Note: because we are subscribing to two different categories, we need to
      //       `INSERT` all the time and `UPDATE` to set the rows as deleted.

      if (type === 'SubscriptionCreated') {
        await pool.query(
          sql`INSERT INTO subscriptions (subscription_id, store_id, name, category, target)
            VALUES (${identifier}, ${data.store_id}, ${data.name}, ${data.category}, 'poll')
            ON CONFLICT (subscription_id)
                DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, store_id = EXCLUDED.store_id`
        );
      } else if (type === 'SQSQueueRequested') {
        await pool.query(
          sql`INSERT INTO subscriptions (subscription_id, target)
            VALUES (${identifier}, 'sqs')
            ON CONFLICT (subscription_id)
                DO UPDATE SET target = EXCLUDED.target`
        );
      } else if (type === 'SubscriptionDeleted') {
        await pool.query(
          sql`UPDATE subscriptions SET deleted = true WHERE subscription_id = ${identifier}`
        );
      }
    },
  };
}
