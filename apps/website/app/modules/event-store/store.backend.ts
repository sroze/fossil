import { createPool } from './pg';
import { MessageDbClient } from './message-db/client';

export const fossilEventStore = new MessageDbClient(
  createPool(process.env.DATABASE_URL!)
);
