import { MessageDbClient } from './client';
import { Pool } from 'pg';
import { MessageDbStore } from './store';
import { setupMessageDb } from './setup';
import { v4 } from 'uuid';
import { accumulate } from '../accumulate';

describe('MessageDB client', () => {
  let pool: Pool;
  let store: MessageDbStore;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    await setupMessageDb(pool);

    store = new MessageDbStore(new MessageDbClient(pool));
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('stream', () => {
    describe('write', () => {
      it('re-uses the provided event identifier', async () => {
        const stream = `Foo-${v4()}`;
        const id = v4();

        const { position } = await store.appendEvents(
          stream,
          [{ id, type: 'MyEvent', data: {} }],
          null
        );

        const events = await accumulate(store.readStream(stream, position));
        expect(events.length).toEqual(1);
        expect(events[0].id).toEqual(id);
      });
    });
  });

  describe('category', () => {
    it('returns only events from the category', async () => {
      const category = v4().replace(/-/g, '');
      await Promise.all([
        store.appendEvents(
          `${category}-${v4}`,
          [{ type: 'EventOne', data: {} }],
          null
        ),
        store.appendEvents(
          `${category}-${v4}`,
          [{ type: 'EventTwo', data: {} }],
          null
        ),
      ]);

      const events = await accumulate(store.readCategory(category));
      expect(events.length).toEqual(2);
    });

    it.todo('supports wildcards for prefixes');
  });
});
