export interface CheckpointStrategy {
  /**
   * Returns `true` the checkpointing should happen.
   *
   */
  shouldCheckpoint(): boolean;
}
