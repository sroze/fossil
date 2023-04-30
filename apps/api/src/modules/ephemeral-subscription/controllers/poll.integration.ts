import { TestApplication } from '../../../../test/test-application';
import { v4 } from 'uuid';
import { EventToWrite } from 'event-store';
import {
  generateEvent,
  generateEvents,
} from '../../../../test/event-generator';
import { StoreLocator } from 'store-locator';
import { NdjsonClient } from '../utils/testing';
import { EventInStoreDto } from '../../store/controllers/read';
import { EventOverTheWire } from 'event-serialization';

describe('Poll', () => {
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('for a category', () => {
    const category = `Category${v4().replace(/-/g, '')}`;
    let events: EventToWrite[];
    let token: string;

    beforeAll(async () => {
      // Generate events
      events = generateEvents(20);
      const store = await app.get(StoreLocator).locate(app.defaultStoreId);
      for (const event of events) {
        await store.appendEvents(`${category}-${v4()}`, [event], -1n);
      }

      // Create a token to read.
      token = await app.generateToken(app.defaultStoreId, {
        read: { streams: [`${category}-*`] },
      });
    });

    it('returns a batch of messages and can continue through with the position query', async () => {
      const path = `/stores/${
        app.defaultStoreId
      }/categories/${encodeURIComponent(category)}/poll?maxEvents=10`;

      const client = new NdjsonClient<EventInStoreDto>(app, {
        method: 'GET',
        path,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const receivedFirst = await client.receive((res) => {
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toEqual('application/x-ndjson');
        expect(res.headers['connection']).toEqual('keep-alive');
      });

      // Expect events to have been received.
      expect(receivedFirst.map((e: any) => e.id)).toEqual(
        events.slice(0, 10).map((e) => e.id),
      );

      const receivedSecond = await client.receive(undefined, {
        path:
          path +
          '&after=' +
          receivedFirst[receivedFirst.length - 1].global_position,
      });

      expect(receivedSecond.map((e: any) => e.id)).toEqual(
        events.slice(10, 20).map((e) => e.id),
      );
    });

    it('times out if no message is published to the durable subscription', async () => {
      const client = new NdjsonClient<EventOverTheWire>(app, {
        method: 'GET',
        path: `/stores/${app.defaultStoreId}/categories/${encodeURIComponent(
          category,
        )}/poll?maxEvents=21&idleTimeout=1`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const timeBefore = performance.now();
      const received = await client.receive();
      expect(performance.now() - timeBefore).toBeGreaterThan(1000);
      expect(received.length).toEqual(20);
    });

    it('waits for a message to be published to the durable subscription if not enough are in store', async () => {
      const client = new NdjsonClient<EventOverTheWire>(app, {
        method: 'GET',
        path: `/stores/${app.defaultStoreId}/categories/${encodeURIComponent(
          category,
        )}/poll?maxEvents=21&idleTimeout=1`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const additionalEvent = generateEvent();
      const promise = client.receive(async () => {
        // When response first arrived, let's write an additional event!
        const store = await app.get(StoreLocator).locate(app.defaultStoreId);
        await store.appendEvents(`${category}-${v4()}`, [additionalEvent], -1n);
      });

      const received = await promise;
      expect(received.length).toEqual(21);
      expect(received[20].id).toEqual(additionalEvent.id);
    });
  });

  describe('for a stream', () => {
    const stream = `SampleStream-${v4()}`;
    let events: EventToWrite[];
    let token: string;

    beforeAll(async () => {
      // Generate events
      events = generateEvents(20);
      const store = await app.get(StoreLocator).locate(app.defaultStoreId);
      await store.appendEvents(stream, events, -1n);

      // Create a token to read.
      token = await app.generateToken(app.defaultStoreId, {
        read: { streams: [stream] },
      });
    });

    it('works similarly to the category', async () => {
      const path = `/stores/${app.defaultStoreId}/streams/${encodeURIComponent(
        stream,
      )}/poll?maxEvents=10`;

      const client = new NdjsonClient<EventInStoreDto>(app, {
        method: 'GET',
        path,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const receivedFirst = await client.receive((res) => {
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toEqual('application/x-ndjson');
        expect(res.headers['connection']).toEqual('keep-alive');
      });

      expect(receivedFirst.map((e: any) => e.id)).toEqual(
        events.slice(0, 10).map((e) => e.id),
      );

      const receivedSecond = await client.receive(undefined, {
        path:
          path + '&after=' + receivedFirst[receivedFirst.length - 1].position,
      });

      expect(receivedSecond.map((e: any) => e.id)).toEqual(
        events.slice(10, 20).map((e) => e.id),
      );
    });
  });
});
