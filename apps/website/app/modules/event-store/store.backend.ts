import { createPool } from './pg';
import { MessageDbClient, MessageDbStore } from 'event-store';

export const pool = createPool(process.env.DATABASE_URL!);
export const fossilEventStore = new MessageDbStore(new MessageDbClient(pool));
