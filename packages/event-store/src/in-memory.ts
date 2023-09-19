import {
  EventInStore,
  EventToWrite,
  IEventStore,
  MinimumEventType,
} from './interfaces';

export class InMemoryStore<T extends MinimumEventType = MinimumEventType>
  implements IEventStore
{
  private readonly events: EventInStore<T>[] = [];
  private globalPosition = 0n;

  constructor(events: Array<{ stream: string; event: EventToWrite<T> }> = []) {
    for (const { stream, event } of events) {
      // We know it's a synchronous append.
      void this.appendEvents(stream, [event], null);
    }
  }

  appendEvents<T extends MinimumEventType>(
    streamName: string,
    events: EventToWrite<T>[],
    expectedVersion: bigint | null
  ) {
    // TODO

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
