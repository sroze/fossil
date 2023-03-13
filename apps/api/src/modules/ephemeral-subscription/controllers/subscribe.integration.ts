import { TestApplication } from '../../../../test/test-application';
import * as http from 'http';
import { RequestOptions } from 'http';
import request from 'supertest';
import { v4 } from 'uuid';
import {
  generateEvent,
  generateEvents,
} from '../../../../test/event-generator';
import { requestOptionsFromApp } from '../../../../test/request';

type MessageEvent = { data: string; id: string; event: string };
class SseClient {
  public received: Partial<MessageEvent>[] = [];

  private options: RequestOptions;
  private request: http.ClientRequest;

  constructor(app: TestApplication, request: RequestOptions) {
    this.options = {
      ...requestOptionsFromApp(app),
      ...request,
    };
  }

  receive(
    responseCallback?: (res: http.IncomingMessage) => void,
    errorCallback?: (error: Error) => void,
  ) {
    this.request = http.request(this.options, (res) => {
      if (responseCallback) {
        responseCallback(res);
      }

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        if (chunk.length === 0) {
          return;
        }

        const parsed: Partial<MessageEvent> = {};
        for (const line of chunk.split('\n')) {
          if (line.length === 0) {
            continue;
          }

          const separatorIndex = line.indexOf(': ');
          parsed[line.substring(0, separatorIndex)] = line.substring(
            separatorIndex + 2,
          );
        }

        if ('data' in parsed) {
          this.received.push(parsed);
        }
      });

      res.on('end', function () {
        console.log('Request is closed by the server.');
      });
    });

    this.request.on('error', function (e) {
      if (errorCallback) {
        errorCallback(e);
      }
    });

    // Send the HTTP request.
    this.request.write('');
    this.request.end();
  }

  close() {
    this.request.destroy();
  }
}

describe('Subscribe', () => {
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('to a category', () => {
    it('refuses if the token has not been crafted for this stream', async () => {
      // Receive events.
      const token = await app.generateToken('123', {
        read: { streams: [`AnotherCategory-*`] },
      });

      const client = new SseClient(app, {
        method: 'GET',
        path: `/stores/123/categories/CategoryOne/subscribe`,
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
      });

      try {
        client.receive((res) => {
          expect(res.statusCode).toEqual(403);
        });
      } finally {
        client.close();
      }
    });

    it('sends the history of events by default', async () => {
      const category = `MyCategory${v4().replace(/-/g, '')}`;

      // Write some events
      const events = generateEvents(5);
      await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(
          app.withToken('123', {
            write: { streams: [`${category}-*`] },
          }),
        )
        .send({
          stream: `${category}-${v4()}`,
          events,
        })
        .expect(201);

      // Receive events.
      const token = await app.generateToken('123', {
        read: { streams: [`${category}-*`] },
      });

      const client = new SseClient(app, {
        method: 'GET',
        path: `/stores/123/categories/${category}/subscribe`,
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
      });

      client.receive((res) => {
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toEqual('text/event-stream');
        expect(res.headers['connection']).toEqual('keep-alive');
      });

      // Wait for events to be flushed to us and close.
      await new Promise((resolve) => setTimeout(resolve, 100));
      client.close();

      expect(client.received.map((e) => JSON.parse(e.data).id)).toEqual(
        events.map((e) => e.id),
      );
    });

    it('sends events that are being written after the subscription is opened', async () => {
      const token = await app.generateToken('123', {
        read: { streams: ['Foo-*'] },
      });

      const client = new SseClient(app, {
        method: 'GET',
        path: `/stores/123/categories/Foo/subscribe`,
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
      });

      client.receive();

      try {
        // Add an event.
        const stream = `Foo-${v4()}`;
        const event = generateEvent();
        await request(app.getHttpServer())
          .post('/stores/123/events')
          .use(
            app.withToken('123', {
              write: { streams: [stream] },
            }),
          )
          .send({ stream, events: [event] })
          .expect(201);

        // Wait for 500ms, largely enough in theory.
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Expect the previous events _and_ the new one.
        const lastMessageContent =
          client.received[client.received.length - 1].data;
        expect(lastMessageContent).toBeTruthy();
        const decodedMessage = JSON.parse(lastMessageContent);
        expect(decodedMessage.id).toEqual(event.id);
      } finally {
        // Closes the HTTP request, from a client perspective.
        client.close();
      }
    });

    it('enables reconnection through the event ids', async () => {
      const category = `MyCategory${v4().replace(/-/g, '')}`;

      // Write some events
      const events = generateEvents(5);
      await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(
          app.withToken('123', {
            write: { streams: [`${category}-*`] },
          }),
        )
        .send({
          stream: `${category}-${v4()}`,
          events,
        })
        .expect(201);

      // Receive events.
      const token = await app.generateToken('123', {
        read: { streams: [`${category}-*`] },
      });

      const client = new SseClient(app, {
        method: 'GET',
        path: `/stores/123/categories/${category}/subscribe`,
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
      });

      client.receive((res) => {
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toEqual('text/event-stream');
        expect(res.headers['connection']).toEqual('keep-alive');
      });

      // Wait for events to be flushed to us and close.
      await new Promise((resolve) => setTimeout(resolve, 100));
      client.close();

      // Expect `id`s to exist
      for (const e of client.received) {
        expect(e.id).toBeDefined();
      }

      const startingAt = client.received[client.received.length - 3].id;
      const expectedEvents = client.received.slice(client.received.length - 2);

      // Receive again...
      const secondClient = new SseClient(app, {
        method: 'GET',
        path: `/stores/123/categories/${category}/subscribe`,
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
          'Last-Event-Id': startingAt,
        },
      });

      // Wait for events to be flushed to us and close.
      secondClient.receive();
      await new Promise((resolve) => setTimeout(resolve, 100));
      secondClient.close();

      expect(secondClient.received.map((e) => e.id)).toEqual(
        expectedEvents.map((e) => e.id),
      );
    });

    it.todo('exposes the EOF messages');
  });

  describe('to a stream', () => {
    it('works with a category token', async () => {
      const category = `MyCategory${v4().replace(/-/g, '')}`;
      const stream = `${category}-${v4()}`;

      // Write some events
      const events = generateEvents(5);
      await request(app.getHttpServer())
        .post('/stores/123/events')
        .use(
          app.withToken('123', {
            write: { streams: [`${category}-*`] },
          }),
        )
        .send({
          stream,
          events,
        })
        .expect(201);

      // Receive events.
      const token = await app.generateToken('123', {
        read: { streams: [`${category}-*`] },
      });

      const client = new SseClient(app, {
        method: 'GET',
        path: `/stores/123/streams/${stream}/subscribe`,
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
      });

      client.receive((res) => {
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toEqual('text/event-stream');
      });

      // Wait for events to be flushed to us and close.
      await new Promise((resolve) => setTimeout(resolve, 100));
      client.close();

      expect(client.received.map((e) => JSON.parse(e.data).id)).toEqual(
        events.map((e) => e.id),
      );
    });
  });
});
