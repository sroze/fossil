import { v4 } from 'uuid';
import request from 'supertest';
import { TestApplication } from '../../../../test/test-application';

describe('Durable subscription management', () => {
  const storeId = v4();
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init(storeId);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create', () => {
    it('refuses if the token does not have the necessary permissions', async () => {
      await request(app.getHttpServer())
        .post(`/stores/${storeId}/subscriptions`)
        .use(
          app.withToken('123', {
            management: ['subscriptions'],
          }),
        )
        .send({ category: 'Foo', name: 'My subscription' })
        .expect(401);

      await request(app.getHttpServer())
        .post(`/stores/${storeId}/subscriptions`)
        .use(
          app.withToken(storeId, {
            read: { streams: ['*'] },
            write: { streams: ['*'] },
          }),
        )
        .send({ category: 'Foo', name: 'My subscription' })
        .expect(403);
    });

    it('allows to create if token can manage subscriptions', async () => {
      await request(app.getHttpServer())
        .post(`/stores/${storeId}/subscriptions`)
        .use(
          app.withToken(storeId, {
            management: ['subscriptions'],
          }),
        )
        .send({ category: 'Foo', name: 'My subscription' })
        .expect(201);
    });
  });

  describe('delete', () => {
    it.todo(
      'allows to delete a subscription with an explicit subscription identifier in the token',
    );
    it.todo(
      'allows to delete a subscription with a subscription identifier wildcard in the token',
    );
  });
});
