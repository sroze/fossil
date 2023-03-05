import request from 'supertest';
import { v4 } from 'uuid';
import { generateKey, generateToken } from 'store-security';
import { DateTime } from 'luxon';
import { TestApplication } from '../../test/test-application';

describe('Write', () => {
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init();
  });

  afterAll(async () => {
    await app.close();
  });

  const fooEvent = { type: 'FooType', data: { foo: 'bar' } };

  describe('With an invalid request', () => {
    it('refuses an empty body', async () => {
      await request(app.getHttpServer()).post('/stores/124/events').expect(400);
    });

    it('refuses a request without a stream', async () => {
      await request(app.getHttpServer())
        .post('/stores/124/events')
        .send({
          events: [fooEvent],
        })
        .expect(400);
    });

    it('refuses a request without events', async () => {
      await request(app.getHttpServer())
        .post('/stores/124/events')
        .send({
          stream: 'Foo-123',
        })
        .expect(400);
    });
  });

  describe('Without authentication tokens', () => {
    it('returns a 401', async () => {
      await request(app.getHttpServer())
        .post('/stores/124/events')
        .send({ stream: 'Foo-123', events: [fooEvent] })
        .expect(401);
    });
  });

  describe('With an invalid authentication token', () => {
    it('returns 401 if the token cannot be extracted from the header', async () => {
      await request(app.getHttpServer())
        .post('/stores/124/events')
        .set('authorization', 'something weird')
        .send({ stream: 'Foo-123', events: [fooEvent] })
        .expect(401);
    });

    it('returns 401 if the token has been crafted with the wrong encryption key', async () => {
      const anotherKey = await generateKey();
      const token = await generateToken(anotherKey.private, {
        exp: DateTime.now().valueOf() / 1000 + 3600,
        fossil: {
          store_id: '123',
        },
      });

      await request(app.getHttpServer())
        .post('/stores/123/events')
        .set('authorization', `Bearer ${token}`)
        .send({ stream: 'Foo-123', events: [fooEvent] })
        .expect(401);
    });

    it('returns 401 if the token does not match this store', async () => {
      await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(
          app.withToken('123', {
            store_id: '678',
          }),
        )
        .send({ stream: 'Foo-123', events: [fooEvent] })
        .expect(401);
    });
  });

  describe('With a valid authentication token', () => {
    it('returns 403 if they are not to write', async () => {
      await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(app.withToken('123', {}))
        .send({ stream: 'Foo-123', events: [fooEvent] })
        .expect(403);
    });

    it('returns 403 if the allowed streams are not matching', async () => {
      await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(
          app.withToken('123', {
            write: { streams: ['Bar-123'] },
          }),
        )
        .send({ stream: 'Foo-123', events: [fooEvent] })
        .expect(403);
    });

    it('writes the event if the stream is allowed', async () => {
      const stream = `Foo-${v4()}`;

      const { body } = await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(
          app.withToken('123', {
            write: { streams: [stream] },
          }),
        )
        .send({ stream, events: [fooEvent] })
        .expect(201);

      expect(body.position).toBe('0');
    });

    it('writes multiple events', async () => {
      const stream = `Foo-${v4()}`;

      const { body } = await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(
          app.withToken('123', {
            write: { streams: [stream] },
          }),
        )
        .send({
          stream,
          events: [fooEvent, { type: 'Bar', data: { foo: 'bar' } }],
        })
        .expect(201);

      expect(body.position).toBe('1');
    });

    it('accepts an "empty stream" as expected version', async () => {
      const stream = `Foo-${v4()}`;

      await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(
          app.withToken('123', {
            write: { streams: [stream] },
          }),
        )
        .send({ stream, events: [fooEvent], expected_version: '-1' })
        .expect(201);
    });

    it('returns a conflict response when the expected version is not was is expected', async () => {
      const stream = `Foo-${v4()}`;

      await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(
          app.withToken('123', {
            write: { streams: [stream] },
          }),
        )
        .send({ stream, events: [fooEvent], expected_version: '1' })
        .expect(409);
    });

    it.todo('Idempotency on write');
    it.todo('Error messages in libe with rfc7807');
    it.todo('Requires streams to be "{category}-{id}" formatted');
  });
});
