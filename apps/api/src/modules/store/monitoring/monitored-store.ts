import {
  AppendResult,
  EventInStore,
  EventToWrite,
  IEventStore,
  MinimumEventType,
} from 'event-store';
import { Counter, LabelValues, Histogram } from 'prom-client';

const latencyBuckets = [
  0.005, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.2, 0.3,
  0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 2, 3, 4, 5, 10, 20, 30,
];

// `type` is the type of read, from `last_event`, `category` or `stream`
const readRequests = new Counter({
  name: 'fossil_read_requests',
  help: 'Number of read requests',
  labelNames: ['store_id', 'type'],
});

const readEvents = new Counter({
  name: 'fossil_read_events',
  help: 'Number of events read',
  labelNames: ['store_id', 'type'],
});

const readBytes = new Counter({
  name: 'fossil_read_bytes',
  help: 'Number of bytes read',
  labelNames: ['store_id', 'type'],
});

const readLatency = new Histogram({
  name: 'fossil_read_latency',
  help: 'Latency for read requests (defined as time-to-first-event) (in seconds)',
  labelNames: ['store_id', 'type'],
  buckets: latencyBuckets,
});

// `status` is either `success` or `failure`.
const writeRequests = new Counter({
  name: 'fossil_write_requests',
  help: 'Number of write requests',
  labelNames: ['store_id', 'status'],
});

const writeEvents = new Counter({
  name: 'fossil_write_events',
  help: 'Number of events written',
  labelNames: ['store_id'],
});

const writeBytes = new Counter({
  name: 'fossil_write_bytes',
  help: 'Number of bytes written',
  labelNames: ['store_id'],
});

const writeLatency = new Histogram({
  name: 'fossil_write_latency',
  help: 'Latency of write requests (in seconds)',
  labelNames: ['store_id'],
  buckets: latencyBuckets,
});

function offHotPath(fn: () => void) {
  setTimeout(fn, 0);
}

function eventBytesSize(event: EventToWrite | EventInStore): number {
  return (
    (event.id ? Buffer.byteLength(event.id) : 0) +
    Buffer.byteLength(event.type) +
    Buffer.byteLength(JSON.stringify(event.data)) +
    (event.metadata ? Buffer.byteLength(JSON.stringify(event.metadata)) : 0)
  );
}

function measureEvents<T extends string>(
  bytesCounter: Counter<T>,
  eventsCounter: Counter<T>,
  labels: LabelValues<T>,
  events: Array<EventToWrite | EventInStore>,
) {
  eventsCounter.inc(labels, events.length);
  bytesCounter.inc(
    labels,
    events.reduce((acc, event) => acc + eventBytesSize(event), 0),
  );
}

export class MonitoredStore implements IEventStore {
  constructor(
    private readonly implementation: IEventStore,
    private readonly labels: { store_id: string },
  ) {}

  appendEvents(
    streamName: string,
    events: EventToWrite[],
    expectedVersion: bigint | null,
  ): Promise<AppendResult> {
    const endTimer = writeLatency.startTimer(this.labels);

    try {
      const happened = this.implementation.appendEvents(
        streamName,
        events,
        expectedVersion,
      );

      writeRequests.inc({ ...this.labels, status: 'success' });

      return happened;
    } catch (e) {
      writeRequests.inc({ ...this.labels, status: 'failure' });

      throw e;
    } finally {
      endTimer();
      measureEvents(writeBytes, writeEvents, this.labels, events);
    }
  }

  async lastEventFromStream<EventType extends MinimumEventType>(
    stream: string,
    type?: string,
  ): Promise<EventInStore<EventType> | undefined> {
    const event = await this.implementation.lastEventFromStream<EventType>(
      stream,
      type,
    );

    offHotPath(() => {
      const labels = { ...this.labels, type: 'last_event' };

      readRequests.inc(labels);
      measureEvents(readBytes, readEvents, labels, [event]);
    });

    return event;
  }

  async *readCategory<EventType extends MinimumEventType = MinimumEventType>(
    category: string,
    fromPosition?: bigint,
    signal?: AbortSignal,
  ): AsyncIterable<EventInStore<EventType>> {
    yield* readAndMeasure(
      this.implementation.readCategory<EventType>(
        category,
        fromPosition,
        signal,
      ),
      { ...this.labels, type: 'category' },
    );
  }

  async *readStream<EventType extends MinimumEventType = MinimumEventType>(
    stream: string,
    fromPosition: bigint,
    signal?: AbortSignal,
  ): AsyncIterable<EventInStore<EventType>> {
    yield* readAndMeasure(
      this.implementation.readStream<EventType>(stream, fromPosition, signal),
      { ...this.labels, type: 'stream' },
    );
  }
}

async function* readAndMeasure<T extends MinimumEventType>(
  generator: AsyncIterable<T>,
  labels: LabelValues<'store_id' | 'type'>,
): AsyncIterable<T> {
  readRequests.inc(labels);

  const endFirstReadTimer = readLatency.startTimer(labels);
  let firstRead = false;

  for await (const event of generator) {
    endFirstReadTimer();
    firstRead = true;

    yield event;

    offHotPath(() => measureEvents(readBytes, readEvents, labels, [event]));
  }

  if (!firstRead) {
    endFirstReadTimer();
  }
}
