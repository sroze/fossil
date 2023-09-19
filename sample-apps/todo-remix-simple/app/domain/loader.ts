import { reduce, TaskState } from './reducer';
import type { AnyTaskEvent } from './events';
import type { EventInStoreDto } from 'fossil-api-client';
import { FossilStoreClient } from '../config/client';

export async function taskFromStore(
  id: string
): Promise<{
  task: TaskState;
  events: (EventInStoreDto & AnyTaskEvent)[];
  version: number;
}> {
  const client = new FossilStoreClient();
  const { events, version } = await client.readStream<AnyTaskEvent>(
    `Task-${id}`
  );

  // Reconstruct the task's state.
  const task = events.reduce(reduce, undefined);
  if (!task) {
    throw new Error(`Task not found.`);
  }

  return { task, events, version };
}
