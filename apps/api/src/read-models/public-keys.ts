import { Pool } from 'pg';
import { IEventStore, StreamName } from 'event-store';
import {
  CheckpointAfterNMessages,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import sql from 'sql-template-tag';

export function main(pool: Pool, store: IEventStore, abortSignal: AbortSignal) {
  const subscription = new Subscription(
    store,
    new WithEventsCheckpointStore(store, 'ConsumerCheckpoint-api-v2'),
    new CheckpointAfterNMessages(1),
  );

  void subscription.subscribeCategory(
    'Store',
    async ({ data, type, stream_name }) => {
      const { identifier: storeId } = StreamName.decompose(stream_name);

      if (type === 'KeyGenerated') {
        if (!data.key_id || !data.public_key) {
          // TODO: Remove this -- was needed for BC.
          return;
        }

        await pool.query(
          sql`INSERT INTO public_keys (store_id, key_id, key_name, public_key_kid, public_key)
            VALUES (${storeId}, ${data.key_id}, ${data.name}, ${
            data.public_key.kid
          }, ${JSON.stringify(data.public_key)})
            ON CONFLICT DO NOTHING`,
        );
      }
    },
    abortSignal,
  );
}
