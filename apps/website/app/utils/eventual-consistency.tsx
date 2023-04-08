import { createCookie } from '@remix-run/node';

export const lastKnownCheckpoint = createCookie('last-known-checkpoint');

type Checkpoint =
  | {
      stream_name: string;
      position: bigint;
    }
  | {
      global_position: bigint;
    };

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
