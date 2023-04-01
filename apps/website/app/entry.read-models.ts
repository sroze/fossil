// Entrypoint, running the various different subscriptions.
import { MessageDbClient, MessageDbStore } from 'event-store';
import { Pool } from 'pg';
import { main as subscription } from './read-models/subscription';
import { main as streams } from './read-models/streams';
import { createPool } from '~/utils/pg.backend';

require('dotenv').config();

const abortController = new AbortController();

process.on('SIGINT', () => abortController.abort());
process.on('SIGTERM', () => abortController.abort());

const pool = createPool(process.env.DATABASE_URL!);
export const store = new MessageDbStore(new MessageDbClient(pool));

(async () => {
  await Promise.race([
    subscription(pool, store, abortController.signal),
    streams(pool, store, abortController.signal),
  ]);
})();
