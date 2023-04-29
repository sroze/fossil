import { TestApplication } from '../../../../test/test-application';
import request from 'supertest';
import { v4 } from 'uuid';
import { runUntilEof } from '../../../utils/runners';
import { PublicKeysReadModel } from '../read-models/keys';

describe('Manage keys', () => {
  const storeId = v4();
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init(storeId);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('with a token that has no ability to manage keys', () => {
    it('is forbidden to list keys', async () => {
      await request(app.getHttpServer())
        .get(`/stores/${storeId}/keys`)
        .use(
          app.withToken(storeId, {
            store_id: storeId,
            read: { streams: ['*'] },
            write: { streams: ['*'] },
          }),
        )
        .expect(403);
    });

    it('is forbidden to create keys', async () => {
      await request(app.getHttpServer())
        .post(`/stores/${storeId}/keys`)
        .use(
          app.withToken(storeId, {
            store_id: storeId,
            read: { streams: ['*'] },
            write: { streams: ['*'] },
          }),
        )
        .send({
          name: 'test',
          type: 'managed',
        })
        .expect(403);
    });
  });

  describe('with a token that has the ability to manage keys', () => {
    it('only return success when creating a managed key', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/stores/${storeId}/keys`)
        .use(
          app.withToken(storeId, {
            store_id: storeId,
            management: ['keys'],
          }),
        )
        .send({
          name: 'test',
          type: 'managed',
        })
        .expect(201);

      expect(body.id).toBeDefined();
      expect(body.public_key).toBeDefined();
      expect(body.private_key).toBeUndefined();
    });

    it('returns the private key when creating a private key', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/stores/${storeId}/keys`)
        .use(
          app.withToken(storeId, {
            store_id: storeId,
            management: ['keys'],
          }),
        )
        .send({
          name: 'test',
          type: 'downloaded',
        })
        .expect(201);

      expect(body.id).toBeDefined();
      expect(body.public_key).toBeDefined();
      expect(body.private_key).toBeDefined();
    });

    it('can delete a key', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/stores/${storeId}/keys`)
        .use(
          app.withToken(storeId, {
            store_id: storeId,
            management: ['keys'],
          }),
        )
        .send({
          name: 'test',
          type: 'managed',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/stores/${storeId}/keys/${body.id}`)
        .use(
          app.withToken(storeId, {
            store_id: storeId,
            management: ['keys'],
          }),
        )
        .expect(200);
    });

    it('can list keys', async () => {
      const keyName = `Name#${v4()}`;
      await request(app.getHttpServer())
        .post(`/stores/${storeId}/keys`)
        .use(
          app.withToken(storeId, {
            store_id: storeId,
            management: ['keys'],
          }),
        )
        .send({
          name: keyName,
          type: 'managed',
        })
        .expect(201);

      await runUntilEof(app.get(PublicKeysReadModel));

      const { body } = await request(app.getHttpServer())
        .get(`/stores/${storeId}/keys`)
        .use(
          app.withToken(storeId, {
            store_id: storeId,
            management: ['keys'],
          }),
        )
        .expect(200);

      expect(body.length).toBeGreaterThan(0);
      const item = (body as any[]).find((i) => i.name === keyName);
      expect(item).toBeDefined();
      expect(item).toMatchObject({
        id: expect.any(String),
        name: keyName,
        type: 'managed',
      });
    });
  });
});
