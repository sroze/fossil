import { TestApplication } from '../../../../test/test-application';
import request from 'supertest';

describe('Authenticated with a cookie', () => {
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('generates cookie through handshake', () => {
    it('refuses to set the cookie if the token is invalid', async () => {
      await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/cookie-handshake`)
        .use(app.withToken('678'))
        .expect(401);
    });

    it('sets a response cookie with a valid token', async () => {
      const { headers } = await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/cookie-handshake`)
        .use(app.withToken(app.defaultStoreId))
        .expect(201);

      expect('set-cookie' in headers).toBeTruthy();
      const setCookieString = headers['set-cookie'][0];
      expect(setCookieString).toBeDefined();
      expect(setCookieString).toContain(`fossil-${app.defaultStoreId}=`);
    });
  });

  describe('authenticated with a cookie', () => {
    it('can read a matching stream', async () => {
      const stream = 'a-stream';

      const { headers } = await request(app.getHttpServer())
        .post(`/stores/${app.defaultStoreId}/cookie-handshake`)
        .use(app.withToken(app.defaultStoreId, { read: { streams: [stream] } }))
        .expect(201);

      await request(app.getHttpServer())
        .get(`/stores/${app.defaultStoreId}/streams/a-stream/events?size=10`)
        .set('cookie', headers['set-cookie'][0])
        .expect(200);
    });
  });
});
