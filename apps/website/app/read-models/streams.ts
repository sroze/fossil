import {
  CheckpointAfterNMessages,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import { categoryFromStream, IEventStore } from 'event-store';
import sql from 'sql-template-tag';
import { Pool } from 'pg';
import {
  PrefixedStreamEventEncoder,
  storeIdentifierFromStreamName,
  storeIdentifierToStreamPrefix,
} from 'store-locator';

// TODO: We need to replace this by a "system" durable subscription per customer store,
//       pointing to the same "system" SQS queue (or similar). This way, we can start
//       abstracting away where the customer stores are and spread them across different
//       databases or even underlying storage mechanism. For performance reasons, this
//       future durable subscription needs to be headers-only.
export async function main(
  pool: Pool,
  store: IEventStore,
  abortSignal: AbortSignal
) {
  const subscription = new Subscription(
    store,
    new WithEventsCheckpointStore(
      store,
      'WebsiteReadModelCheckpoints-Streams-v4'
    ),
    new CheckpointAfterNMessages(100)
  );

  await subscription.subscribeCategory(
    '*',
    async (event) => {
      let storeIdentifier: string | undefined;
      try {
        storeIdentifier = storeIdentifierFromStreamName(event.stream_name);
      } catch (e) {
        console.error(
          `Unable to identify store identifier from stream "${event.stream_name}". Skipping.`
        );
      }

      if (!storeIdentifier) {
        return;
      }

      const streamNameDecoder = new PrefixedStreamEventEncoder(
        storeIdentifierToStreamPrefix(storeIdentifier)
      );

      const streamName = streamNameDecoder.decodeStream(event.stream_name);
      const category = categoryFromStream(streamName);

      await pool.query(
        sql`INSERT INTO store_streams (store_id, stream_name, category, position, first_written_in_at, last_written_in_at)
            VALUES (${storeIdentifier}, ${streamName}, ${category}, ${String(
          event.position
        )}, ${event.time.toISOString()}, ${event.time.toISOString()})
            ON CONFLICT (store_id, stream_name)
                DO UPDATE SET position = EXCLUDED.position, last_written_in_at = EXCLUDED.last_written_in_at`
      );

      await pool.query(
        sql`INSERT INTO store_categories (store_id, category)
            VALUES (${storeIdentifier}, ${category})
            ON CONFLICT DO NOTHING`
      );
    },
    abortSignal
  );
}
