import { ICheckpointStore } from 'subscription';

export class CheckpointStoreWithCallback implements ICheckpointStore {
  public constructor(
    private readonly store: ICheckpointStore,
    private readonly checkpointStored: (position: bigint) => Promise<void>,
  ) {}

  getCheckpoint(): Promise<bigint> {
    return this.store.getCheckpoint();
  }

  storeCheckpoint(position: bigint): Promise<void> {
    return this.store
      .storeCheckpoint(position)
      .then(() => this.checkpointStored(position));
  }
}
