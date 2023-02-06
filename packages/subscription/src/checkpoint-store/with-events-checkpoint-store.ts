import { ICheckpointStore } from './interfaces';
import type { IEventStore } from 'event-store';

export class WithEventsCheckpointStore implements ICheckpointStore {
  constructor(
    private readonly store: IEventStore,
    private readonly stream: string
  ) {}

  async getCheckpoint(): Promise<bigint> {
    const last = await this.store.lastEventFromStream(this.stream);
    return BigInt(last?.data?.position ?? 0);
  }

  async storeCheckpoint(position: bigint): Promise<void> {
    await this.store.appendEvents(
      this.stream,
      [{ type: 'Recorded', data: { position: position.toString() } }],
      null
    );
  }
}
