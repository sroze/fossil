import { Subscription } from 'subscription';
import { IEventStore, StreamName } from 'event-store';
import sql from 'sql-template-tag';
import { Pool } from 'pg';
import { ReadOnlyFromCallback } from 'subscription/dist/checkpoint-store/read-only-from-callback';
import { AnyStoreEvent } from '~/modules/stores/domain';
import { RunnableSubscription } from '~/utils/subscription';

export function factory(
  store: IEventStore,
  pool: Pool
): RunnableSubscription<AnyStoreEvent> {
  return {
    subscription: new Subscription(
      store,
      { category: 'Store' },
      {
        checkpointStore: new ReadOnlyFromCallback(async () => {
          const {
            rows: [{ checkpoint }],
          } = await pool.query(
            sql`SELECT max(last_known_checkpoint) as checkpoint FROM stores`
          );

          return checkpoint ? BigInt(checkpoint) : 0n;
        }),
      }
    ),
    handler: async ({ data, type, stream_name, global_position }) => {
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
      } else if (type === 'StoreDeleted') {
        await pool.query(
          sql`DELETE FROM stores WHERE store_id = ${identifier}`
        );
      }
    },
  };
}
