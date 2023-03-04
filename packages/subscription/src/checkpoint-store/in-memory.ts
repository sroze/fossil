import { ICheckpointStore } from './interfaces';

export class InMemoryCheckpointStore implements ICheckpointStore {
  constructor(private current = 0n) {}

  async getCheckpoint(): Promise<bigint> {
    return this.current;
  }

  async storeCheckpoint(position: bigint): Promise<void> {
    this.current = position;
  }
}
