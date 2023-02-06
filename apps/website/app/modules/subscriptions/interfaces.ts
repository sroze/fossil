import { EventInStore } from 'event-store';

export type StreamFetcher = (
  position: bigint,
  signal: AbortSignal
) => AsyncIterable<EventInStore>;
export type PositionResolver = (event: EventInStore) => bigint;

export interface Subscription {
  subscribe(
    streamFetcher: StreamFetcher,
    positionResolver: PositionResolver,
    handler: (event: EventInStore) => Promise<void>,
    signal: AbortSignal
  ): Promise<void>;
}
