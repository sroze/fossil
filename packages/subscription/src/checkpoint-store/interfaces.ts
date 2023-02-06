export interface ICheckpointStore {
  /**
   * Get the checkpoint
   */
  getCheckpoint(): Promise<bigint>;

  /**
   * Store a new checkpoint
   * @param position The new position
   */
  storeCheckpoint(position: bigint): Promise<void>;
}
