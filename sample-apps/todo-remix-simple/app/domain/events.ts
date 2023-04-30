export type AnyTaskEvent =
  | TaskCreatedEvent
  | TaskCompletedEvent
  | TaskCompletionRevertedEvent
  | TaskNameChangedEvent;

export type TaskCreatedEvent = {
  type: 'TaskCreated';
  data: {
    name: string;
  };
};

export type TaskCompletedEvent = {
  type: 'TaskCompleted';
  data: {};
};

export type TaskCompletionRevertedEvent = {
  type: 'TaskCompletionReverted';
  data: {};
};

export type TaskNameChangedEvent = {
  type: 'TaskNameChanged';
  data: {
    name: string;
  };
};
