import { TestApplication } from '../../../../test/test-application';
import request from 'supertest';
import { runUntilEof } from '../../../utils/runners';
import { PublicKeysReadModel } from '../read-models/keys';
import { EskitService } from '../../../utils/eskit-nest';
import { aggregate as store } from '../domain/aggregate';
import { RootStoreId } from '../constants';
import { generateToken } from 'store-security';
import { DateTime } from 'luxon';

describe('Store management', () => {
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create', () => {
    it('is forbidden without a token', async () => {
      await request(app.getHttpServer())
        .post(`/stores`)
        .send({
          name: 'A store',
        })
        .expect(401);
    });

    it('is unauthorized with a typical management token', async () => {
      await request(app.getHttpServer())
        .post(`/stores`)
        .use(
          app.withToken(app.defaultStoreId, {
            store_id: app.defaultStoreId,
            management: ['*'],
          }),
        )
        .send({
          name: 'A store',
        })
        .expect(401);
    });

    it('returns a management token', async () => {
      const service = app.get<EskitService<typeof store>>(store.symbol);
      const { state } = await service.readOrFail(RootStoreId);
      const token = await generateToken(state.management_key, {
        exp: DateTime.now().plus({ hour: 1 }).valueOf() / 1000,
        fossil: {
          store_id: RootStoreId,
          management: ['*'],
        },
      });

      const { body } = await request(app.getHttpServer())
        .post(`/stores`)
        .set('authorization', `Bearer ${token}`)
        .send({
          name: 'A store',
        })
        .expect(201);

      expect(body.management_token).toBeDefined();

      // Wait for the keys read model.
      await runUntilEof(app.get(PublicKeysReadModel));

      // The token works to create another key.
      await request(app.getHttpServer())
        .post(`/stores/${body.id}/keys`)
        .set('authorization', `Bearer ${body.management_token}`)
        .send({
          name: 'A key',
          type: 'managed',
        })
        .expect(201);
    });
  });

  describe('delete', () => {
    it.todo(
      'is forbidden with a token that can only read/write from the store',
    );
    it.todo('is possible with a management token');
  });
});
