import { CheckpointAfterNMessages, Subscription } from 'subscription';
import { IEventStore, StreamName } from 'event-store';
import sql from 'sql-template-tag';
import { Pool } from 'pg';
import { ReadOnlyFromCallback } from 'subscription/dist/checkpoint-store/read-only-from-callback';
import { AnyStoreEvent } from '~/modules/stores/domain';

export async function main(
  pool: Pool,
  store: IEventStore,
  abortSignal: AbortSignal
) {
  const subscription = new Subscription(
    store,
    new ReadOnlyFromCallback(async () => {
      const {
        rows: [{ checkpoint }],
      } = await pool.query(
        sql`SELECT max(last_known_checkpoint) as checkpoint FROM stores`
      );

      return checkpoint ? BigInt(checkpoint) : 0n;
    }),
    new CheckpointAfterNMessages(1)
  );

  await subscription.subscribeCategory<AnyStoreEvent>(
    'Store',
    async ({ data, type, stream_name, global_position }) => {
      const { identifier } = StreamName.decompose(stream_name);

      if (type === 'StoreCreated') {
        await pool.query(
          sql`INSERT INTO stores (store_id, org_id, name, last_known_checkpoint)
            VALUES (${identifier}, ${data.owning_org_id}, ${
            data.name
          }, ${String(global_position)})
            ON CONFLICT (store_id) DO UPDATE
                SET name = EXCLUDED.name,
                  org_id = EXCLUDED.org_id,
                  last_known_checkpoint = EXCLUDED.last_known_checkpoint`
        );
      }
    },
    abortSignal
  );
}
