import http, { RequestOptions } from 'http';
import { TestApplication } from '../../../../test/test-application';
import { requestOptionsFromApp } from '../../../../test/request';

export class StreamClient<T> {
  public received: T[] = [];

  private options: RequestOptions;
  private request: http.ClientRequest;

  constructor(
    app: TestApplication,
    request: RequestOptions,
    private readonly parse: (chunk: string) => T | T[] | undefined,
  ) {
    this.options = {
      ...requestOptionsFromApp(app),
      ...request,
    };
  }

  receive(
    responseCallback?: (res: http.IncomingMessage) => void,
    optionsOverrides: RequestOptions = {},
  ) {
    this.received = [];

    return new Promise<T[]>((resolve, reject) => {
      this.request = http.request(
        { ...this.options, ...optionsOverrides },
        (res) => {
          if (responseCallback) {
            responseCallback(res);
          }

          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            if (chunk.length === 0) {
              return;
            }

            const parsed = this.parse(chunk);
            if (parsed) {
              this.received.push(
                ...(Array.isArray(parsed) ? parsed : [parsed]),
              );
            }
          });

          res.on('end', () => {
            resolve(this.received);
          });
        },
      );

      this.request.on('close', () => {
        resolve(this.received);
      });

      this.request.on('error', function (e) {
        reject(e);
      });

      // Send the HTTP request.
      this.request.write('');
      this.request.end();
    });
  }

  close() {
    this.request.destroy();
  }
}

type MessageEvent = { data: string; id: string; event: string };

export class SseClient extends StreamClient<Partial<MessageEvent>> {
  constructor(app: TestApplication, request: RequestOptions) {
    super(app, request, (chunk) => {
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

      return 'data' in parsed ? parsed : undefined;
    });
  }
}

export class NdjsonClient<T = object> extends StreamClient<T> {
  constructor(app: TestApplication, request: RequestOptions) {
    super(app, request, (chunk) => {
      return chunk
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    });
  }
}
