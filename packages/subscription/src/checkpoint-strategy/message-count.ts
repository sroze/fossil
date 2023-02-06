import { CheckpointStrategy } from './interfaces';

export class CheckpointAfterNMessages implements CheckpointStrategy {
  private count: number = 0;

  constructor(private readonly numberOfMessages: number) {}

  shouldCheckpoint(): boolean {
    if (++this.count >= this.numberOfMessages) {
      this.count = 0;

      return true;
    }

    return false;
  }
}
