import { ICheckpointStore } from './interfaces';
import { IEventStore } from '../../event-store/interfaces';

export class WithEventsCheckpointStore implements ICheckpointStore {
  constructor(
    private readonly store: IEventStore,
    private readonly category: string,
    public id: string
  ) {}

  private streamName() {
    return `${this.category}:position-${this.id}`;
  }

  async getCheckpoint(): Promise<bigint> {
    const last = await this.store.lastEventFromStream(this.streamName());
    return BigInt(last?.data?.position ?? 0);
  }

  async storeCheckpoint(position: bigint): Promise<void> {
    await this.store.appendEvents(
      this.streamName(),
      [{ type: 'Recorded', data: { position: position.toString() } }],
      null
    );
  }
}
