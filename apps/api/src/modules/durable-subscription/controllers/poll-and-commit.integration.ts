import { v4 } from 'uuid';
import { TestApplication } from '../../../../test/test-application';
import request from 'supertest';
import { createSubscription, NdjsonClient } from '../utils/testing';
import { EventToWrite, IEventStore } from 'event-store';
import { SystemStore } from '../../../symbols';
import { runUntilEof } from '../../../utils/runners';
import { DurableSubscriptionsReadModel } from '../read-models/durable-subscriptions';
import {
  generateEvent,
  generateEvents,
} from '../../../../test/event-generator';
import { StoreLocator } from 'store-locator';
import { EventOverTheWire } from 'event-serialization';

describe('Poll & Commit', () => {
  const storeId = v4();
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init(storeId);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('with a working durable subscription', () => {
    const subscriptionIdentifier = v4();
    const category = `Category${v4().replace(/-/g, '')}`;

    let events: EventToWrite[];
    let token: string;

    beforeAll(async () => {
      // Create a subscription.
      await createSubscription(
        app.get<IEventStore>(SystemStore),
        storeId,
        subscriptionIdentifier,
        category,
      );

      // Wait for the read-models to have caught up.
      await runUntilEof(app.get(DurableSubscriptionsReadModel));

      // Write many events
      events = generateEvents(20);
      const store = await app.get(StoreLocator).locate(storeId);
      for (const event of events) {
        await store.appendEvents(`${category}-${v4()}`, [event], -1n);
      }

      // Generate the right token
      token = await app.generateToken(storeId, {
        read: { streams: [`${category}-*`] },
      });
    });

    afterEach(async () => {
      // Reset the commit to the beginning.
      await request(app.getHttpServer())
        .put(`/subscriptions/${subscriptionIdentifier}/commit`)
        .set('authorization', `Bearer ${token}`)
        .send({
          position: '0',
        })
        .expect(200);
    });

    it('returns the same messages if no commits are made', async () => {
      const client = new NdjsonClient(app, {
        method: 'GET',
        path: `/subscriptions/${subscriptionIdentifier}/poll?maxEvents=10`,
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

      const receivedSecond = await client.receive();
      expect(receivedSecond).toEqual(receivedFirst);
    });

    it('returns a batch of messages, commits and continue through the stream', async () => {
      const client = new NdjsonClient<EventOverTheWire>(app, {
        method: 'GET',
        path: `/subscriptions/${subscriptionIdentifier}/poll?maxEvents=10`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Expect the first events.
      const firstReceived = await client.receive();
      expect(firstReceived.map((e: any) => e.id)).toEqual(
        events.slice(0, 10).map((e) => e.id),
      );

      // commit
      await request(app.getHttpServer())
        .put(`/subscriptions/${subscriptionIdentifier}/commit`)
        .set('authorization', `Bearer ${token}`)
        .send({
          position: firstReceived[firstReceived.length - 1].global_position,
        })
        .expect(200);

      // Expect the remaining events.
      const secondReceived = await client.receive();
      expect(secondReceived.map((e: any) => e.id)).toEqual(
        events.slice(10, 20).map((e) => e.id),
      );
    });

    describe('idleTimeout', () => {
      it('times out if no message is published to the durable subscription', async () => {
        const client = new NdjsonClient<EventOverTheWire>(app, {
          method: 'GET',
          path: `/subscriptions/${subscriptionIdentifier}/poll?maxEvents=21&idleTimeout=1`,
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
          path: `/subscriptions/${subscriptionIdentifier}/poll?maxEvents=21&idleTimeout=1`,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const additionalEvent = generateEvent();
        const promise = client.receive(async () => {
          // When response first arrived, let's write an additional event!
          const store = await app.get(StoreLocator).locate(storeId);
          await store.appendEvents(
            `${category}-${v4()}`,
            [additionalEvent],
            -1n,
          );
        });

        const received = await promise;
        expect(received.length).toEqual(21);
        expect(received[20].id).toEqual(additionalEvent.id);
      });
    });
  });

  it.todo('refuse if the token cannot read the category');

  it.todo('refuse if the token is for another store');
});
