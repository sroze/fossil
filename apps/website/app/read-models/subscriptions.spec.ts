import { runUntilEof } from '~/utils/subscription';
import {
  factory as subscriptionsFactory,
  SQSQueueRequestedEvent,
  SubscriptionCreated,
} from '~/read-models/subscriptions';
import { fossilEventStore, pool } from '~/config.backend';
import { v4 } from 'uuid';
import sql from 'sql-template-tag';

describe('Subscriptions read model', () => {
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE subscriptions CASCADE');
  });

  afterAll(() => pool.end());

  it('sets target as poll by default', async () => {
    const subscriptionId = v4();

    await fossilEventStore.appendEvents<SubscriptionCreated>(
      `Subscription-${subscriptionId}`,
      [
        {
          type: 'SubscriptionCreated',
          data: {
            store_id: v4(),
            category: 'Foo',
            name: 'my-subscription',
          },
        },
      ],
      null
    );

    await runUntilEof(subscriptionsFactory(fossilEventStore, pool), 1000);

    const {
      rows: [row],
    } = await pool.query(
      sql`SELECT name, category, target FROM subscriptions WHERE subscription_id = ${subscriptionId}`
    );

    expect(row).toEqual({
      name: 'my-subscription',
      category: 'Foo',
      target: 'poll',
    });
  });

  it('sets target as sqs when a queue is requested', async () => {
    const subscriptionId = v4();

    await fossilEventStore.appendEvents<SubscriptionCreated>(
      `Subscription-${subscriptionId}`,
      [
        {
          type: 'SubscriptionCreated',
          data: {
            store_id: v4(),
            category: 'Foo',
            name: 'my-subscription',
          },
        },
      ],
      null
    );

    await fossilEventStore.appendEvents<SQSQueueRequestedEvent>(
      `SqsRelay-${subscriptionId}`,
      [
        {
          type: 'SQSQueueRequested',
          data: {
            subscription_id: subscriptionId,
          },
        },
      ],
      null
    );

    await runUntilEof(subscriptionsFactory(fossilEventStore, pool), 1000);

    const {
      rows: [row],
    } = await pool.query(
      sql`SELECT name, category, target FROM subscriptions WHERE subscription_id = ${subscriptionId}`
    );

    expect(row).toEqual({
      name: 'my-subscription',
      category: 'Foo',
      target: 'sqs',
    });
  });

  it.todo('does not expose deleted subscriptions');
  it.todo(
    'set target as sqs when the "queue is requested" event arrives before the "subscription created"'
  );
});
