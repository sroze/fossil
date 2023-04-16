import { IEventStore } from './interfaces';

type FirstEvent = {
  type: 'Foo';
  data: { foo: string };
};

type SecondEvent = {
  type: 'Bar';
  data: { bar: string };
};

class EmptyStore implements IEventStore {
  appendEvents() {
    return Promise.resolve({
      position: 0n,
      global_position: 0n,
    });
  }

  lastEventFromStream() {
    return Promise.resolve(undefined);
  }

  async *readCategory() {}

  async *readStream() {}

  async statisticsAtPosition(category: string, position: bigint) {
    return {
      approximate_event_timestamp: new Date(),
      approximate_event_count_after: 0,
    };
  }
}

describe('Types', () => {
  const store: IEventStore = new EmptyStore();

  it('enables strict types for appending to the store', async () => {
    await store.appendEvents<FirstEvent>(
      `Foo-123`,
      [{ type: 'Foo', data: { foo: 'foo' } }],
      null
    );
    await store.appendEvents<FirstEvent | SecondEvent>(
      `Foo-123`,
      [{ type: 'Bar', data: { bar: 'bar' } }],
      null
    );

    await store.appendEvents<FirstEvent>(
      `Foo-123`,
      // @ts-expect-error `type` should be validated
      [{ type: 'Baz', data: {} }],
      null
    );

    await store.appendEvents<FirstEvent>(
      `Foo-123`,
      // @ts-expect-error `data` should be validated based on `type`
      [{ type: 'Foo', data: {} }],
      null
    );
  });

  it('enables strict types for subscriptions', async () => {
    for await (const event of store.readCategory<FirstEvent | SecondEvent>(
      'Foo'
    )) {
      if (event.type === 'Foo') {
        event.data.foo;
        // @ts-expect-error we should not have a full union.
        event.data.bar;
      } else if (event.type === 'Bar') {
        // @ts-expect-error we should not have a full union.
        event.data.foo;
        event.data.bar;
      }

      // @ts-expect-error we expect an error here!
      if (event.type === 'Baz') {
      }
    }
  });
});
