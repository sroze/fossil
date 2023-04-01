import { MessageDbClient, MessageDbStore } from 'event-store';
import { createPool } from '~/utils/pg.backend';

export const pool = createPool(process.env.DATABASE_URL!);

export const fossilEventStore = new MessageDbStore(
  new MessageDbClient(createPool(process.env.FOSSIL_DATABASE_URL!))
);
