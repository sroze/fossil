import { ICheckpointStore } from './interfaces';

export class ReadOnlyFromCallback implements ICheckpointStore {
  constructor(private readonly callback: () => Promise<bigint>) {}
  getCheckpoint(): Promise<bigint> {
    return this.callback();
  }

  async storeCheckpoint(position: bigint): Promise<void> {
    // no-op.
  }
}
