// Entrypoint, running the various different subscriptions.
import { MessageDbClient, MessageDbStore } from 'event-store';
import { Pool } from 'pg';
import { main as subscription } from './modules/subscriptions/subscription';

require('dotenv').config();

const abortController = new AbortController();

process.on('SIGINT', () => abortController.abort());
process.on('SIGTERM', () => abortController.abort());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10,
  connectionTimeoutMillis: 10000,
  statement_timeout: 60000,
});

export const store = new MessageDbStore(new MessageDbClient(pool));

(async () => {
  subscription(pool, store, abortController.signal);
})();

export {};
