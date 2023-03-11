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
          `${category}-${v4()}`,
          [{ type: 'EventOne', data: {} }],
          null
        ),
        store.appendEvents(
          `${category}-${v4()}`,
          [{ type: 'EventTwo', data: {} }],
          null
        ),
      ]);

      const events = await accumulate(store.readCategory(category));
      expect(events.length).toEqual(2);
    });

    describe('wildcards', () => {
      it.each(['Foo-*', 'Pre-fix#*', 'Bar*'])(
        'does not support invalid category matcher (%s)',
        async (category) => {
          expect.assertions(1);

          try {
            await accumulate(store.readCategory(category));
          } catch (e) {
            expect(e).toBeInstanceOf(Error);
          }
        }
      );

      it('supports reading from multiple categories with prefixes', async () => {
        const prefix = v4().replace(/-/g, '');
        const category1 = v4().replace(/-/g, '');
        const category2 = v4().replace(/-/g, '');

        await Promise.all([
          store.appendEvents(
            `${prefix}#${category1}-${v4()}`,
            [{ type: 'EventOne', data: {} }],
            null
          ),
          store.appendEvents(
            `${prefix}#${category2}-${v4()}`,
            [{ type: 'EventTwo', data: {} }],
            null
          ),
        ]);

        const events = await accumulate(store.readCategory(`${prefix}#*`));
        expect(events.length).toEqual(2);
      });

      it('supports reading everything', async () => {
        const events = await accumulate(store.readCategory(`*`), 10);
        expect(events.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
