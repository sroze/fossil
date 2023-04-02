// Entrypoint, running the various different subscriptions.
import { MessageDbClient, MessageDbStore } from 'event-store';
import { main as subscription } from './read-models/subscription';
import { main as streams } from './read-models/streams';
import { main as stores } from './read-models/store';
import { createPool } from '~/utils/pg.backend';

require('dotenv').config();

const abortController = new AbortController();

process.on('SIGINT', () => abortController.abort());
process.on('SIGTERM', () => abortController.abort());

const pool = createPool(process.env.WEBSITE_DATABASE_URL!);
export const store = new MessageDbStore(
  new MessageDbClient(createPool(process.env.API_DATABASE_URL!))
);

(async () => {
  await Promise.race([
    subscription(pool, store, abortController.signal),
    streams(pool, store, abortController.signal),
    stores(pool, store, abortController.signal),
  ]);
})();
