import { Pool } from 'pg';
import { EventInStore, IEventStore, StreamName } from 'event-store';
import { Subscription, WithEventsCheckpointStore } from 'subscription';
import sql from 'sql-template-tag';
import { AnySubscriptionEvent } from '../domain/events';
import { Inject, Injectable } from '@nestjs/common';
import { SystemDatabasePool, SystemStore } from '../../../symbols';

export type SQSSubscriptionRow = {
  store_id: string;
  subscription_id: string;
  subscription_category: string;
  sqs_queue_url: string;
};

@Injectable()
export class SqsSubscriptionsReadModel {
  constructor(
    @Inject(SystemStore)
    private readonly store: IEventStore,
    @Inject(SystemDatabasePool)
    private readonly pool: Pool,
  ) {}

  async run(
    abortSignal: AbortSignal,
    onEOF?: () => Promise<void>,
  ): Promise<void> {
    const subscription = new Subscription(
      this.store,
      { category: 'Subscription' },
      {
        checkpointStore: new WithEventsCheckpointStore(
          this.store,
          'SqsSubscriptionsReadModel-v3',
        ),
      },
    );

    return subscription.start<AnySubscriptionEvent>(
      { onMessage: (e) => this.handle(e), onEOF: () => onEOF && onEOF() },
      abortSignal,
    );
  }

  private async handle({
    type,
    data,
    stream_name,
    position,
  }: EventInStore<AnySubscriptionEvent>): Promise<void> {
    const { identifier: subscriptionId } = StreamName.decompose(stream_name);

    if (type === 'SubscriptionReady') {
      await this.pool.query(
        sql`INSERT INTO sqs_subscriptions (store_id, subscription_id, subscription_category, sqs_queue_url, position)
            VALUES (${data.store_id}, ${subscriptionId}, ${data.category}, ${
          data.sqs_queue_url
        }, ${String(position)})
            ON CONFLICT (store_id, subscription_id)
                DO UPDATE SET subscription_category = EXCLUDED.subscription_category, sqs_queue_url = EXCLUDED.sqs_queue_url, position = EXCLUDED.position`,
      );
    } else if (type === 'SubscriptionDeleted') {
      await this.pool.query(
        sql`DELETE FROM sqs_subscriptions WHERE subscription_id = ${subscriptionId}`,
      );
    }
  }
}
