import type { AnyTaskEvent } from '~/domain/events';

export type TaskState = {
  name: string;
  completed: boolean;
};

export function reduceMany(
  events: AnyTaskEvent[],
  state?: TaskState | undefined
): TaskState | undefined {
  return events.reduce(reduce, state);
}

const reduce = (
  state: TaskState | undefined,
  { type, data }: AnyTaskEvent
): TaskState | undefined => {
  if (type === 'TaskCreated') {
    return {
      name: data.name,
      completed: false,
    };
  } else if (state === undefined) {
    throw new Error(`This task was not created.`);
  }

  if (type === 'TaskNameChanged') {
    state.name = data.name;
  } else if (type === 'TaskCompleted') {
    state.completed = true;
  } else if (type === 'TaskCompletionReverted') {
    state.completed = false;
  }

  return state;
};
