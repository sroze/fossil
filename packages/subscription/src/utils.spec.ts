import type { EventInStore } from 'event-store';
import { composeHandlers } from './utils';

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
