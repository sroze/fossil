import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { Transform } from 'stream';
import type {
  WritableHeaderStream,
  AdditionalHeaders,
} from '@nestjs/core/router/sse-stream';

/**
 * @see https://github.com/nestjs/nest/blob/e33c5509e271805c3be84136ea73f985daf55a13/packages/core/router/sse-stream.ts#L53
 */
export class NdjsonStream extends Transform {
  constructor(req?: IncomingMessage) {
    super({ objectMode: true });
    if (req && req.socket) {
      req.socket.setKeepAlive(true);
      req.socket.setNoDelay(true);
      req.socket.setTimeout(0);
    }
  }

  pipe<T extends WritableHeaderStream>(
    destination: T,
    options?: {
      additionalHeaders?: AdditionalHeaders;
      end?: boolean;
    },
  ): T {
    if (destination.writeHead) {
      destination.writeHead(200, {
        ...options?.additionalHeaders,
        // See https://github.com/dunglas/mercure/blob/master/hub/subscribe.go#L124-L130
        'Content-Type': 'application/x-ndjson',
        Connection: 'keep-alive',
        // Disable cache, even for old browsers and proxies
        'Cache-Control':
          'private, no-cache, no-store, must-revalidate, max-age=0, no-transform',
        Pragma: 'no-cache',
        Expire: '0',
        // NGINX support https://www.nginx.com/resources/wiki/start/topics/examples/x-accel/#x-accel-buffering
        'X-Accel-Buffering': 'no',
      });
      destination.flushHeaders();
    }

    destination.write('\n');
    return super.pipe(destination, options);
  }

  _transform(
    message: object,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void,
  ) {
    this.push(JSON.stringify(message));
    callback();
  }

  /**
   * Calls `.write` but handles the drain if needed
   */
  writeLine(message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const callbackToPromiseResolver = (error: Error | null | undefined) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      if (!this.write(message, 'utf-8', callbackToPromiseResolver)) {
        this.once('drain', callbackToPromiseResolver);
      } else {
        process.nextTick(resolve);
      }
    });
  }
}
