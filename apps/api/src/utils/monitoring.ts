import { EventInStore, EventToWrite } from 'event-store';
import { Counter, LabelValues } from 'prom-client';

function eventBytesSize(event: EventToWrite | EventInStore): number {
  if (!event) {
    throw new Error('Received an undefined event');
  }

  return (
    (event.id ? Buffer.byteLength(event.id) : 0) +
    Buffer.byteLength(event.type) +
    Buffer.byteLength(JSON.stringify(event.data)) +
    (event.metadata ? Buffer.byteLength(JSON.stringify(event.metadata)) : 0)
  );
}

export function measureEvents<T extends string>(
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

export function offHotPath(fn: () => void) {
  setTimeout(fn, 0);
}
