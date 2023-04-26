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

export async function getCheckpointFromRequest(
  request: Request
): Promise<Checkpoint | undefined> {
  const lastKnown = await lastKnownCheckpoint.parse(
    request.headers.get('cookie')
  );
  if (lastKnown.value) {
    return deserializeCheckpoint(lastKnown.value);
  }

  return undefined;
}

export async function setCookieForCheckpoint(
  checkpoint: Checkpoint
): Promise<HeadersInit> {
  return {
    'set-cookie': await lastKnownCheckpoint.serialize({
      value: serializeCheckpoint(checkpoint),
      expires: null,
    }),
  };
}

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
  if ('stream_name' in checkpoint) {
    return `${checkpoint.stream_name}:${checkpoint.position}`;
  }

  return `global:${checkpoint.global_position}`;
}

export function deserializeCheckpoint(checkpoint: string): Checkpoint {
  const [streamName, position] = checkpoint.split(':');

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
