import { Request } from 'express';
import { WritableHeaderStream } from '@nestjs/core/router/sse-stream';
import { SubscriptionInterface } from 'subscription';
import { NdjsonStream } from '../../durable-subscription/utils/ndjson-stream';
import { serializeEventInStoreForWire } from 'event-serialization';

export async function subscriptionAsNdjsonStream(
  request: Request,
  res: WritableHeaderStream,
  subscription: SubscriptionInterface,
  maxEvents: number,
  idleTimeout: number,
) {
  const controller = new AbortController();
  request.on('close', () => controller.abort());

  const stream = new NdjsonStream(request);
  stream.pipe(res, {});

  let idleTimeoutId: NodeJS.Timeout | undefined = setTimeout(
    () => controller.abort(),
    idleTimeout * 1000,
  );

  let numberOfEvents = 0;
  await subscription.start(async (event) => {
    clearTimeout(idleTimeoutId);
    idleTimeoutId = setTimeout(() => controller.abort(), idleTimeout * 1000);

    await stream.writeLine(serializeEventInStoreForWire(event));

    if (++numberOfEvents >= maxEvents) {
      controller.abort();
    }
  }, controller.signal);

  clearTimeout(idleTimeoutId);
  res.end();
}
