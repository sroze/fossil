import { Pool } from 'pg';
import { EventInStore, IEventStore, StreamName } from 'event-store';
import { Subscription } from 'subscription';
import sql from 'sql-template-tag';
import { AnySubscriptionEvent } from '../domain/events';
import { Inject, Injectable } from '@nestjs/common';
import { SystemDatabasePool, SystemStore } from '../../../symbols';
import { ReadOnlyFromCallback } from 'subscription/dist/checkpoint-store/read-only-from-callback';

@Injectable()
export class DurableSubscriptionsReadModel {
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
        checkpointStore: new ReadOnlyFromCallback(async () => {
          const {
            rows: [{ checkpoint }],
          } = await this.pool.query(
            sql`SELECT max(last_known_checkpoint) as checkpoint FROM durable_subscriptions`,
          );

          return checkpoint ? BigInt(checkpoint) : 0n;
        }),
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
    global_position,
  }: EventInStore<AnySubscriptionEvent>): Promise<void> {
    const { identifier: subscriptionId } = StreamName.decompose(stream_name);

    if (type === 'SubscriptionCreated') {
      await this.pool.query(
        sql`INSERT INTO durable_subscriptions (store_id, subscription_id, subscription_category, last_known_checkpoint)
            VALUES (${data.store_id}, ${subscriptionId}, ${
          data.category
        }, ${String(global_position)})
            ON CONFLICT (store_id, subscription_id)
                DO UPDATE SET subscription_category = EXCLUDED.subscription_category, last_known_checkpoint = EXCLUDED.last_known_checkpoint`,
      );
    } else if (type === 'SubscriptionDeleted') {
      await this.pool.query(
        sql`DELETE FROM durable_subscriptions WHERE subscription_id = ${subscriptionId}`,
      );
    }
  }
}
