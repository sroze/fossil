import { TestApplication } from '../../../../test/test-application';
import request from 'supertest';
import { generateToken, PrivateKey, TokenAuthenticator } from 'store-security';
import { runUntilEof } from '../../../utils/runners';
import { PublicKeysReadModel } from '../read-models/keys';
import { EskitService } from '../../../utils/eskit-nest';
import { aggregate as store } from '../domain/aggregate';
import { DateTime } from 'luxon';
import { v4 } from 'uuid';

describe('Token generation', () => {
  let app: TestApplication;
  let managementKey: PrivateKey;
  let managementToken: string;

  beforeAll(async () => {
    app = await TestApplication.create().init();
    await runUntilEof(app.get(PublicKeysReadModel));
    const service = app.get<EskitService<typeof store>>(store.symbol);
    const { state } = await service.readOrFail(app.defaultStoreId);

    managementKey = state.management_key;
    managementToken = await generateToken(managementKey, {
      exp: DateTime.now().plus({ hour: 1 }).valueOf() / 1000,
      fossil: {
        store_id: app.defaultStoreId,
        read: { streams: ['*'] },
        management: ['*'],
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('with a management token', () => {
    it('generates a read token', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/tokens`)
        .set('authorization', `Bearer ${managementToken}`)
        .send({
          claims: {
            read: { streams: ['Foo-123'] },
          },
        })
        .expect(201);

      expect(body.token).toBeDefined();

      const {
        claims: { fossil: claims },
      } = await app
        .get(TokenAuthenticator)
        .authorize(app.defaultStoreId, body.token);

      expect(claims).toEqual({
        store_id: app.defaultStoreId,
        read: { streams: ['Foo-123'] },
      });
    });

    it('refuses to generate a token that expires after the current one', async () => {
      await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/tokens`)
        .set('authorization', `Bearer ${managementToken}`)
        .send({
          exp: DateTime.now().plus({ hour: 2 }).valueOf() / 1000,
          claims: {
            read: { streams: ['Foo-123'] },
          },
        })
        .expect(400);
    });

    it('generates a token from another managed key', async () => {
      const {
        body: { id: key_id, public_key },
      } = await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/keys`)
        .set('authorization', `Bearer ${managementToken}`)
        .send({
          name: v4(),
          type: 'managed',
        })
        .expect(201);

      // Wait for the keys read model.
      await runUntilEof(app.get(PublicKeysReadModel));

      const { body } = await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/tokens`)
        .set('authorization', `Bearer ${managementToken}`)
        .send({
          key_id,
          claims: {
            management: ['*'],
          },
        })
        .expect(201);

      expect(body.token).toBeDefined();

      const { public_kid } = await app
        .get(TokenAuthenticator)
        .authorize(app.defaultStoreId, body.token);

      const { kid: expected_kid } = JSON.parse(public_key);

      expect(public_kid).toEqual(expected_kid);
    });
  });

  describe('with a category read token', () => {
    let token: string;

    beforeAll(async () => {
      token = await generateToken(managementKey, {
        exp: DateTime.now().plus({ hour: 1 }).valueOf() / 1000,
        fossil: {
          store_id: app.defaultStoreId,
          read: { streams: ['Foo-*'] },
        },
      });
    });

    it('generates a read token for a stream of the category', async () => {
      await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/tokens`)
        .set('authorization', `Bearer ${token}`)
        .send({
          claims: {
            read: { streams: ['Foo-123'] },
          },
        })
        .expect(201);
    });

    it('refuses to generate a read token for a stream outside of the category', async () => {
      await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/tokens`)
        .set('authorization', `Bearer ${token}`)
        .send({
          claims: {
            read: { streams: ['Bar-*'] },
          },
        })
        .expect(403);
    });

    it('refuses to generate a write token for the category', async () => {
      await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/tokens`)
        .set('authorization', `Bearer ${token}`)
        .send({
          claims: {
            write: { streams: ['Foo-*'] },
          },
        })
        .expect(403);
    });

    it('refuses to generate a token from another key', async () => {
      const {
        body: { id: key_id },
      } = await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/keys`)
        .set('authorization', `Bearer ${managementToken}`)
        .send({
          name: v4(),
          type: 'managed',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/tokens`)
        .set('authorization', `Bearer ${token}`)
        .send({
          key_id,
          claims: {
            management: ['*'],
          },
        })
        .expect(403);
    });
  });

  it('refuses the generation of a token if the user is not authenticated', async () => {
    await request(app.getHttpServer())
      .post(`/stores/${app.defaultStoreId}/tokens`)
      .send({
        claims: {
          read: { streams: ['Foo-123'] },
        },
      })
      .expect(401);
  });
});
