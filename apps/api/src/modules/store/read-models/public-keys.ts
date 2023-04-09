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
          'ConsumerCheckpoint-api-v2',
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
  }: EventInStore): Promise<void> {
    const { identifier: storeId } = StreamName.decompose(stream_name);

    if (type === 'KeyGenerated') {
      if (!data.key_id || !data.public_key) {
        // TODO: Remove this -- was needed for BC.
        return;
      }

      await this.pool.query(
        sql`INSERT INTO public_keys (store_id, key_id, key_name, public_key_kid, public_key)
            VALUES (${storeId}, ${data.key_id}, ${data.name}, ${
          data.public_key.kid
        }, ${JSON.stringify(data.public_key)})
            ON CONFLICT DO NOTHING`,
      );
    }
  }
}
