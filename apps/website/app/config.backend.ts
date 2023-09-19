import { MessageDbClient, MessageDbStore } from 'event-store';
import { createPool } from '~/utils/pg.backend';

// For dev. experience, using `.env` files.
require('dotenv').config();

export const pool = createPool(process.env.WEBSITE_DATABASE_URL!);

const fossilPool = createPool(process.env.API_DATABASE_URL!);
export const fossilEventStore = new MessageDbStore(
  new MessageDbClient(fossilPool)
);

export const close = async () => {
  await pool.end();
  await fossilPool.end();
};
