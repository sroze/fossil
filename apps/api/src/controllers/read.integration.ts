import request from 'supertest';
import { TestApplication } from '../../test/test-application';
import { v4 } from 'uuid';
import { StoreLocator } from 'store-locator';
import { generateEvents } from '../../test/event-generator';
import { EventToWrite } from 'event-store';

describe('Read', () => {
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('With an invalid authentication token', () => {
    it('returns 401 if the token does not match this store', async () => {
      await request(app.getHttpServer())
        .get('/stores/123/streams/Foo-123/events')
        .use(
          app.withToken('123', {
            store_id: '678',
          }),
        )
        .expect(401);
    });
  });

  describe('With a valid authentication token', () => {
    describe('a stream', () => {
      let stream: string;
      let events: EventToWrite[];

      beforeAll(async () => {
        stream = `Foo-${v4()}`;
        events = generateEvents(20);

        const store = await app.get(StoreLocator).locate('123');
        await store.appendEvents(stream, events, -1n);
      });

      it('returns events in stream order', async () => {
        const { body } = await request(app.getHttpServer())
          .get(`/stores/123/streams/${encodeURI(stream)}/events?size=10`)
          .use(app.withToken('123', { read: { streams: [stream] } }))
          .expect(200);

        const ids = body.items.map((e) => e.id);
        expect(ids).toEqual(events.slice(0, 10).map((e) => e.id));
      });

      it('handles pagination through the stream position', async () => {
        const {
          body: { pagination },
        } = await request(app.getHttpServer())
          .get(`/stores/123/streams/${encodeURI(stream)}/events?size=10`)
          .use(app.withToken('123', { read: { streams: [stream] } }))
          .expect(200);

        const { body } = await request(app.getHttpServer())
          .get(pagination.next)
          .use(app.withToken('123', { read: { streams: [stream] } }))
          .expect(200);

        const ids = body.items.map((e) => e.id);
        expect(ids).toEqual(events.slice(10, 20).map((e) => e.id));
      });
    });

    describe('a store', () => {
      it.todo('refuses if the token has not been crafted for all streams');

      it.todo('returns events based on the global order');

      it.todo('handles pagination through the global order');
    });
  });
});
