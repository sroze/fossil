import type { AnyTaskEvent } from './events';

export type TaskState = {
  name: string;
  completed: boolean;
};

export const reduce = (
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
