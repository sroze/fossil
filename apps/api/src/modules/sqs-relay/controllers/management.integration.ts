import { v4 } from 'uuid';
import { TestApplication } from '../../../../test/test-application';
import request from 'supertest';
import { createSubscription } from '../../durable-subscription/utils/testing';
import { IEventStore } from 'event-store';
import { SystemStore } from '../../../symbols';

describe('SQS relay management', () => {
  const storeId = v4();
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init(storeId);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('with a token that has the ability to manage subscriptions', () => {
    const subscriptionIdentifier = v4();
    const category = `Category${v4().replace(/-/g, '')}`;

    beforeAll(async () => {
      // Create a subscription.
      await createSubscription(
        app.get<IEventStore>(SystemStore),
        storeId,
        subscriptionIdentifier,
        category,
      );
    });

    it('can create a relay', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/stores/${storeId}/sqs-relays`)
        .use(
          app.withToken(storeId, {
            management: ['subscriptions'],
          }),
        )
        .send({
          subscription_id: subscriptionIdentifier,
        })
        .expect(201);

      expect(body.id).toBeTruthy();
    });

    it.todo('can delete a target');
  });

  it.todo('refuses if the token can only read/write from the store');
});
