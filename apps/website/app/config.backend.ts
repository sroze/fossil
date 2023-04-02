import { MessageDbClient, MessageDbStore } from 'event-store';
import { createPool } from '~/utils/pg.backend';

export const pool = createPool(process.env.WEBSITE_DATABASE_URL!);

export const fossilEventStore = new MessageDbStore(
  new MessageDbClient(createPool(process.env.API_DATABASE_URL!))
);
