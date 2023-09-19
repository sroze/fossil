import { Subscription } from './subscription';
import type { EventInStore, IEventStore } from 'event-store';
import { InMemoryCheckpointStore } from './checkpoint-store/in-memory';
import { sleep } from './sleep';
import { v4 } from 'uuid';

function generatorFromEvents(
  events: EventInStore[]
): IEventStore['readCategory'] {
  return async function* (
    streamOrCategory: string,
    position: bigint
  ): AsyncIterable<any> {
    for (const event of events) {
      if (
        event.stream_name === streamOrCategory &&
        event.position >= position
      ) {
        yield event;
      }
    }
  };
}

describe('Subscription', () => {
  const pollingFrequencyInMs = 10;

  let subscription: Subscription;
  let eventsInStore: EventInStore[];
  let store: IEventStore;

  beforeEach(() => {
    eventsInStore = [
      {
        id: v4(),
        position: 0n,
        stream_name: 'Foo-123',
        global_position: 0n,
        data: {},
        type: 'AnEvent',
        time: new Date(),
      },
    ];

    store = {
      // @ts-expect-error we need to fix these types!
      readCategory: jest.fn(generatorFromEvents(eventsInStore)),
      // @ts-expect-error we need to fix these types!
      readStream: jest.fn(generatorFromEvents(eventsInStore)),
      lastEventFromStream: jest.fn(),
      appendEvents: jest.fn(),
    };

    subscription = new Subscription(
      store,
      { stream: 'Foo-123' },
      { checkpointStore: new InMemoryCheckpointStore(), pollingFrequencyInMs }
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches events from the store and returns them, until abort', async () => {
    const controller = new AbortController();
    const events = [];
    const promise = subscription.start(async (event) => {
      events.push(event);
    }, controller.signal);

    await sleep(pollingFrequencyInMs * 5);
    controller.abort();
    await promise;

    expect(events.length).toEqual(1);
  });

  it('shares EOF signals, only once after reading events', async () => {
    const onMessage = jest.fn();
    const onEOF = jest.fn();

    const controller = new AbortController();
    const promise = subscription.start({ onMessage, onEOF }, controller.signal);
    await sleep(pollingFrequencyInMs * 5);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onEOF).toHaveBeenCalledTimes(1);
    expect(onEOF).toHaveBeenCalledWith(1n);

    eventsInStore.push({
      id: v4(),
      position: 1n,
      stream_name: 'Foo-123',
      global_position: 1n,
      data: {},
      type: 'AnotherEvent',
      time: new Date(),
    });

    await sleep(pollingFrequencyInMs * 5);
    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onEOF).toHaveBeenCalledTimes(1);

    controller.abort();
    await promise;
  });
});
