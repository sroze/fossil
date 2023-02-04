import { createPool } from './pg';
import { MessageDbClient } from './message-db/client';
import { MessageDbStore } from './message-db/store';

export const fossilEventStore = new MessageDbStore(
  new MessageDbClient(createPool(process.env.DATABASE_URL!))
);
