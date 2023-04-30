import { ActionFunction, json, LoaderFunction } from '@remix-run/node';
import { storeApi } from '~/config/fossil';
import { AnyTaskEvent } from '~/domain/events';
import { useLoaderData } from '@remix-run/react';
import { reduceMany, TaskState } from '~/domain/reducer';
import type { EventInStoreDto } from 'fossil-api-client';
import React, { useState } from 'react';
import { zfd } from 'zod-form-data';
import { FossilStoreClient } from '~/config/client';

type LoaderData = {
  id: string;
  events: EventInStoreDto[];
  task: TaskState;
};

const editTaskSchema = zfd.formData({
  name: zfd.text().optional(),
  completed: zfd.checkbox().optional(),
});

export const action: ActionFunction = async ({ params, request }) => {
  const id = params.id!;
  const { name, completed } = editTaskSchema.parse(await request.formData());

  // Fetch the task's events and latest version.
  const client = new FossilStoreClient();
  const { events, version } = await client.readStream<AnyTaskEvent>(
    `Task-${id}`
  );

  // Reconstruct the task's state.
  const task = reduceMany(events);
  if (!task) {
    throw new Error(`Task not found.`);
  }

  // Apply any particular type of checks, rules, idempotency checks, etc...
  const eventsToAppend: AnyTaskEvent[] = [];
  if (completed !== undefined) {
    // This enables us to have idempotent writes: we only generate an event
    // once, even if the command will be sent twice.
    if (completed && !task.completed) {
      eventsToAppend.push({
        type: 'TaskCompleted',
        data: {},
      });
    } else if (!completed && task.completed) {
      eventsToAppend.push({
        type: 'TaskCompletionReverted',
        data: {},
      });
    }
  }

  if (name !== undefined) {
    if (name !== task.name) {
      eventsToAppend.push({
        type: 'TaskNameChanged',
        data: {
          name,
        },
      });
    } else {
      // Here, we could throw an exception to enforce some sort
      // of business constraint.
    }
  }

  // We add the events. Because we use `expected_version` as the version of the stream
  // before we did our various checks before, we ensure that we would have a failure
  // at write time if anything else has changed in our stream in the meantime.
  if (events.length > 0) {
    await client.appendEvents<AnyTaskEvent>(
      `Task-${id}`,
      eventsToAppend,
      version
    );
  }

  return json({});
};

export const loader: LoaderFunction = async ({ params }) => {
  const id = params.id!;

  const client = new FossilStoreClient();
  const { events } = await client.readStream<AnyTaskEvent>(`Task-${id}`);

  const task = reduceMany(events);
  if (!task) {
    throw new Error(`Task not found.`);
  }

  return json<LoaderData>({
    id,
    events,
    task,
  });
};

const EditableTextAsInput: React.FC<{ name: string; initialValue: string }> = ({
  name,
  initialValue,
}) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [value, setValue] = useState<string>(initialValue);

  return (
    <div>
      {editing ? (
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditing(false);
            }
          }}
        />
      ) : (
        <>
          <input type="hidden" name={name} value={value} />
          <span onClick={() => setEditing(true)}>{initialValue}</span>
        </>
      )}
    </div>
  );
};

export default function Task() {
  const { id, events, task } = useLoaderData<LoaderData>();

  return (
    <div>
      <form action={`/tasks/${id}`} method="post">
        <input
          type="checkbox"
          checked={task.completed}
          name="completed"
          onChange={(e) => {
            e.target.form?.submit();
          }}
        />
      </form>

      <form action={`/tasks/${id}`} method="post">
        <EditableTextAsInput name="name" initialValue={task.name} />
      </form>

      <h2>History</h2>
      <ul>
        {events.map((e) => (
          <li key={e.id}>
            {e.type} @ {e.time}
          </li>
        ))}
      </ul>
    </div>
  );
}
