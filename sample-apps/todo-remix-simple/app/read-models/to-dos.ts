import type { AnyTaskEvent } from '../domain/events';
import type { EventInStoreDto } from 'fossil-api-client';
import { StreamName } from 'event-store';
import { taskFromStore } from '../domain/loader';
import { FossilStoreClient } from '../config/client';

export type ToDosState = Array<{ id: string; name: string }>;

const client = new FossilStoreClient();

export async function reduce(
  state: ToDosState | undefined,
  { type, data, stream_name }: EventInStoreDto & AnyTaskEvent
): Promise<ToDosState> {
  if (!state) {
    state = [];
  }

  const { identifier } = StreamName.decompose(stream_name);
  if (type === 'TaskCreated') {
    state.push({ name: data.name, id: identifier });
  } else if (type === 'TaskCompleted') {
    state = state.filter((t) => t.id !== identifier);
  } else if (type === 'TaskCompletionReverted') {
    // We don't have what we need in the state anymore... we need to go and
    // find the latest task's state in the stream.
    const { task } = await taskFromStore(identifier);

    state.push({
      id: identifier,
      name: task.name,
    });
  } else if (type === 'TaskNameChanged') {
    // If the task is in the state, we can mutate it straight away. If not, it must
    // have been completed and we can ignore the event.
    const task = state.find((t) => t.id === identifier);
    if (task) {
      task.name = data.name;
    }
  }

  return state;
}

export async function read(): Promise<{ state: ToDosState; version: number }> {
  const head = await client.head(`TaskList`);
  if (!head) {
    return { state: [], version: 0 };
  }

  return { state: head.data as ToDosState, version: Number(head.position) };
}

export async function write(
  state: ToDosState,
  expectedVersion: number
): Promise<void> {
  await client.appendEvents(
    `TaskList`,
    [{ type: 'Snapshot', data: state }],
    expectedVersion
  );
}

export async function* handle(
  stream: AsyncGenerator<EventInStoreDto & AnyTaskEvent>
): AsyncGenerator<EventInStoreDto> {
  let { state, version } = await read();

  for await (const event of stream) {
    const newState = await reduce(state, event);
    const { position } = await client.appendEvents(
      `TaskList`,
      [{ type: 'Snapshot', data: newState }],
      version
    );

    // Will send a signal to the parent, saying we processed an event. It will
    // be used to record the latest position for this read-model.
    yield event;

    // To reduce the number of back & forth with the store, we can keep
    // local track of the state and versions. If there is another writer for some
    // reason, future write will fail and we'll restart by reading the head again.
    version = Number(position);
    state = newState;
  }
}
