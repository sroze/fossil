import { ICheckpointStore } from './interfaces';

export class CachedInMemory implements ICheckpointStore {
  private cached?: bigint;

  constructor(private readonly store: ICheckpointStore) {}

  async getCheckpoint(): Promise<bigint> {
    if (this.cached === undefined) {
      this.cached = await this.store.getCheckpoint();
    }

    return this.cached;
  }

  async storeCheckpoint(position: bigint | null): Promise<void> {
    await this.store.storeCheckpoint(position);

    this.cached = position || undefined;
  }
}
