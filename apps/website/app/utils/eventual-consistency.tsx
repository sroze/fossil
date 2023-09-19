import { createCookie } from '@remix-run/node';
import { ICheckpointStore, sleep } from 'subscription';

export const lastKnownCheckpoint = createCookie('last-known-checkpoint');

type Checkpoint =
  | {
      stream_name: string;
      position: bigint;
    }
  | {
      global_position: bigint;
    };

export async function cookieContentForCheckpoint(
  checkpoint: Checkpoint
): Promise<string> {
  const value = await lastKnownCheckpoint.serialize({
    value: serializeCheckpoint(checkpoint),
    expires: null,
  });

  return value.substring(0, value.indexOf(';'));
}

export function serializeCheckpoint(checkpoint: Checkpoint): string {
  const str =
    'stream_name' in checkpoint
      ? `${checkpoint.stream_name}:${checkpoint.position}`
      : `global:${checkpoint.global_position}`;

  return Buffer.from(str).toString('base64');
}

export function deserializeCheckpoint(checkpoint: string): Checkpoint {
  const asString = Buffer.from(checkpoint, 'base64').toString();
  const [streamName, position] = asString.split(':');

  if (streamName === 'global') {
    return {
      global_position: BigInt(position),
    };
  }

  return {
    stream_name: streamName,
    position: BigInt(position),
  };
}

/**
 * Wait for this checkpoint store to be at the said position, for a maximum amount of time.
 */
export async function waitFor(
  checkpointStore: ICheckpointStore,
  position: bigint,
  timeoutInMs: number
): Promise<void> {
  const controller = new AbortController();

  // Start the timer
  const timeout = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutInMs);

  try {
    while (!controller.signal.aborted) {
      if ((await checkpointStore.getCheckpoint()) >= position) {
        return;
      }

      await sleep(100, controller.signal);
    }

    throw new Error(`Timeout waiting for the subscription.`);
  } finally {
    clearTimeout(timeout);
  }
}
