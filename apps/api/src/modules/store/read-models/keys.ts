import { Pool } from 'pg';
import { EventInStore, IEventStore, StreamName } from 'event-store';
import { Subscription, WithEventsCheckpointStore } from 'subscription';
import sql from 'sql-template-tag';
import { Inject, Injectable } from '@nestjs/common';
import { SystemDatabasePool, SystemStore } from '../../../symbols';
import { AnyStoreEvent } from '../domain/events';

@Injectable()
export class PublicKeysReadModel {
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
      { category: 'Store' },
      {
        checkpointStore: new WithEventsCheckpointStore(
          this.store,
          'ConsumerCheckpoint-Keys-v1',
        ),
      },
    );

    return subscription.start<AnyStoreEvent>(
      { onMessage: (e) => this.handle(e), onEOF: () => onEOF && onEOF() },
      abortSignal,
    );
  }

  private async handle({
    type,
    data,
    stream_name,
  }: EventInStore<AnyStoreEvent>): Promise<void> {
    const { identifier: storeId } = StreamName.decompose(stream_name);

    if (type === 'KeyCreated') {
      await this.pool.query(
        sql`INSERT INTO keys (store_id, key_id, key_name, public_key_kid, public_key, private_key)
            VALUES (${storeId}, ${data.key_id}, ${data.name}, ${
          data.public_key.kid
        }, ${JSON.stringify(data.public_key)}, ${
          data.private_key ? JSON.stringify(data.private_key) : null
        })
            ON CONFLICT DO NOTHING`,
      );
    } else if (type === 'KeyDeleted') {
      await this.pool.query(
        sql`DELETE FROM keys WHERE store_id = ${storeId} AND key_id = ${data.key_id}`,
      );
    }
  }
}
