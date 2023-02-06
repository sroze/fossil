import { createPool } from './pg';
import { MessageDbClient, MessageDbStore } from 'event-store';

export const fossilEventStore = new MessageDbStore(
  new MessageDbClient(createPool(process.env.DATABASE_URL!))
);
