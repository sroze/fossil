import request from 'supertest';
import { TestApplication } from '../../../../test/test-application';
import { v4 } from 'uuid';
import { StoreLocator } from 'store-locator';
import { generateEvents } from '../../../../test/event-generator';
import { EventToWrite } from 'event-store';

describe('Read', () => {
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('a stream', () => {
    let stream: string;
    let events: EventToWrite[];

    beforeAll(async () => {
      stream = `Foo-${v4()}`;
      events = generateEvents(20);

      const store = await app.get(StoreLocator).locate(app.defaultStoreId);
      await store.appendEvents(stream, events, -1n);
    });

    it('returns 401 for a stream if the token does not match this store', async () => {
      await request(app.getHttpServer())
        .get(`/stores/${app.defaultStoreId}/streams/Foo-123/events`)
        .use(
          app.withToken(app.defaultStoreId, {
            store_id: '678',
          }),
        )
        .expect(401);
    });

    it('returns events in stream order', async () => {
      const { body } = await request(app.getHttpServer())
        .get(
          `/stores/${app.defaultStoreId}/streams/${encodeURI(
            stream,
          )}/events?size=10`,
        )
        .use(app.withToken(app.defaultStoreId, { read: { streams: [stream] } }))
        .expect(200);

      const ids = body.items.map((e) => e.id);
      expect(ids).toEqual(events.slice(0, 10).map((e) => e.id));
    });

    it('handles pagination through the stream position', async () => {
      const {
        body: { pagination },
      } = await request(app.getHttpServer())
        .get(
          `/stores/${app.defaultStoreId}/streams/${encodeURI(
            stream,
          )}/events?size=10`,
        )
        .use(app.withToken(app.defaultStoreId, { read: { streams: [stream] } }))
        .expect(200);

      const { body } = await request(app.getHttpServer())
        .get(pagination.next)
        .use(app.withToken(app.defaultStoreId, { read: { streams: [stream] } }))
        .expect(200);

      const ids = body.items.map((e) => e.id);
      expect(ids).toEqual(events.slice(10, 20).map((e) => e.id));
    });

    it('returns the head of the stream', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/stores/${app.defaultStoreId}/streams/${encodeURI(stream)}/head`)
        .use(app.withToken(app.defaultStoreId, { read: { streams: [stream] } }))
        .expect(200);

      expect(body.id).toEqual(events[events.length - 1].id);
    });
  });

  describe('a category', () => {
    let category: string;
    let events: EventToWrite[];

    beforeAll(async () => {
      category = `Category${v4().replace(/-/g, '')}`;
      events = generateEvents(20);

      const store = await app.get(StoreLocator).locate(app.defaultStoreId);
      for (const event of events) {
        await store.appendEvents(`${category}-${v4()}`, [event], -1n);
      }
    });

    it('returns 401 for a category if the token does not match this store', async () => {
      await request(app.getHttpServer())
        .get(
          `/stores/${app.defaultStoreId}/categories/${encodeURI(
            category,
          )}/events`,
        )
        .use(
          app.withToken(app.defaultStoreId, {
            store_id: '678',
          }),
        )
        .expect(401);
    });

    it('returns 403 for a category if the token does not allow the category', async () => {
      await request(app.getHttpServer())
        .get(
          `/stores/${app.defaultStoreId}/categories/${encodeURI(
            category,
          )}/events`,
        )
        .use(
          app.withToken(app.defaultStoreId, {
            read: { streams: [`Foo-*`] },
          }),
        )
        .expect(403);
    });

    it('returns events based on the global order', async () => {
      const { body } = await request(app.getHttpServer())
        .get(
          `/stores/${app.defaultStoreId}/categories/${encodeURI(
            category,
          )}/events?size=10`,
        )
        .use(
          app.withToken(app.defaultStoreId, {
            read: { streams: [`${category}-*`] },
          }),
        )
        .expect(200);

      const ids = body.items.map((e) => e.id);
      expect(ids).toEqual(events.slice(0, 10).map((e) => e.id));
    });

    it('handles pagination through the global order', async () => {
      const {
        body: { pagination },
      } = await request(app.getHttpServer())
        .get(
          `/stores/${app.defaultStoreId}/categories/${encodeURI(
            category,
          )}/events?size=10`,
        )
        .use(
          app.withToken(app.defaultStoreId, {
            read: { streams: [`${category}-*`] },
          }),
        )
        .expect(200);

      const { body } = await request(app.getHttpServer())
        .get(pagination.next)
        .use(
          app.withToken(app.defaultStoreId, {
            read: { streams: [`${category}-*`] },
          }),
        )
        .expect(200);

      const ids = body.items.map((e) => e.id);
      expect(ids).toEqual(events.slice(10, 20).map((e) => e.id));
    });
  });
});
