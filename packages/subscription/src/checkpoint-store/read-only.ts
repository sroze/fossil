import { ICheckpointStore } from './interfaces';

export class ReadOnly implements ICheckpointStore {
  constructor(private readonly store: ICheckpointStore) {}

  async getCheckpoint(): Promise<bigint> {
    return this.store.getCheckpoint();
  }

  async storeCheckpoint(position: bigint): Promise<void> {
    // no-op.
  }
}
