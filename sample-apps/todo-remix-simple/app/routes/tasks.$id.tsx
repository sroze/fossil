import { ActionFunction, json, LoaderFunction } from '@remix-run/node';
import type { AnyTaskEvent } from '../domain/events';
import { useLoaderData } from '@remix-run/react';
import type { TaskState } from '../domain/reducer';
import type { EventInStoreDto } from 'fossil-api-client';
import React from 'react';
import { zfd } from 'zod-form-data';
import { FossilStoreClient } from '../config/client';
import { taskFromStore } from '../domain/loader';
import { EditableTextAsInput } from '../components/editable-text-input';
import { ListItem } from '../components/tasks/list-item';

type LoaderData = {
  id: string;
  events: EventInStoreDto[];
  task: TaskState;
};

const editTaskSchema = zfd.formData({
  name: zfd.text(),
  completed: zfd.checkbox(),
});

export const action: ActionFunction = async ({ params, request }) => {
  const id = params.id!;
  const { name, completed } = editTaskSchema.parse(await request.formData());

  // Fetch the task's events and latest version.
  const client = new FossilStoreClient();
  const { task, version } = await taskFromStore(id);

  // Apply any particular type of checks, rules, idempotency checks, etc...
  const eventsToAppend: AnyTaskEvent[] = [];
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

  // We add the events. Because we use `expected_version` as the version of the stream
  // before we did our various checks before, we ensure that we would have a failure
  // at write time if anything else has changed in our stream in the meantime.
  if (eventsToAppend.length > 0) {
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

  const { task, events } = await taskFromStore(id);

  return json<LoaderData>({
    id,
    events,
    task,
  });
};

export default function Task() {
  const { id, events, task } = useLoaderData<LoaderData>();

  return (
    <div>
      <div className="bg-gray-100 p-2 rounded-md mb-3">
        <ListItem id={id} name={task.name} completed={task.completed} />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        History
      </h2>

      <ol className="relative border-l border-gray-200 dark:border-gray-700">
        {events.map((e) => (
          <li key={e.id} className="mb-2 ml-4">
            <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>
            <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
              {e.time}
            </time>
            <h3 className="text-gray-900 dark:text-white">{e.type}</h3>
          </li>
        ))}
      </ol>
    </div>
  );
}
