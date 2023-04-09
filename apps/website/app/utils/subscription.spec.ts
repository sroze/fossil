import type { EventInStore } from 'event-store';
import {
  composeHandlers,
  ConditionNotReachedError,
  subscribeUntil,
} from '~/utils/subscription';
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

describe('composeHandlers', () => {
  it('calls both handlers and returns the last value', async () => {
    const firstSimpleHandler = jest.fn(() => Promise.resolve('1'));
    const secondComplexHandler = {
      onMessage: jest.fn(() => Promise.resolve('2')),
      onEOF: jest.fn(() => Promise.resolve('eof')),
    };

    const { onEOF, onMessage } = composeHandlers(
      firstSimpleHandler,
      secondComplexHandler
    );

    expect(await onMessage(dummyEvent)).toEqual('2');
    expect(firstSimpleHandler).toHaveBeenCalledWith(dummyEvent);
    expect(secondComplexHandler.onMessage).toHaveBeenCalledWith(dummyEvent);

    expect(await onEOF(1n)).toEqual('eof');
    expect(secondComplexHandler.onEOF).toHaveBeenCalledWith(1n);
  });

  it('supports partial advanced handlers', async () => {
    const firstSimpleHandler = jest.fn(() => Promise.resolve(1));
    const secondComplexHandler = {
      onEOF: jest.fn(),
    };

    const { onEOF, onMessage } = composeHandlers(
      firstSimpleHandler,
      secondComplexHandler
    );

    expect(await onMessage(dummyEvent)).toBeUndefined();
    expect(await onEOF(1n)).toBeUndefined();
    expect(secondComplexHandler.onEOF).toHaveBeenCalled();
  });

  it('supports different types return types from handlers', async () => {
    const { onMessage } = composeHandlers(
      () => Promise.resolve('2'),
      () => Promise.resolve(1)
    );

    const response = await onMessage(dummyEvent);
    expect(typeof response).toEqual('number');
  });
});

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
