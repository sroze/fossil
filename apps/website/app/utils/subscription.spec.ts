import type { EventInStore } from 'event-store';
import { ConditionNotReachedError, subscribeUntil } from '~/utils/subscription';
import { asAdvancedHandler, Handler, sleep, Subscription } from 'subscription';

const dummyEvent: EventInStore = {
  id: '1',
  stream_name: 'Foo-123',
  global_position: 1n,
  position: 1n,
  time: new Date(),
  type: 'Foo',
  data: { foo: 'bar' },
};

async function regularlyStreamEvents(
  handler: Handler<any, any>,
  signal: AbortSignal,
  interval: number = 10
) {
  while (true) {
    await asAdvancedHandler(handler).onMessage(dummyEvent);
    await sleep(interval, signal);

    if (signal.aborted) {
      return;
    }
  }
}

describe('subscribeUntil', () => {
  it('returns as soon as a handler returns a truthy value', async () => {
    const start = performance.now();
    await subscribeUntil(
      { start: regularlyStreamEvents } as Subscription,
      () => Promise.resolve(true),
      100
    );
    const timeTaken = performance.now() - start;
    expect(timeTaken).toBeLessThan(100);
  });

  it('throws an error if the timeout is reached', async () => {
    await expect(
      subscribeUntil(
        { start: regularlyStreamEvents } as Subscription,
        () => Promise.resolve(false),
        100
      )
    ).rejects.toThrowError(ConditionNotReachedError);
  });
});
