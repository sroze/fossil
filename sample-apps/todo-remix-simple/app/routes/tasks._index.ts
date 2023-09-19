import { ActionFunction, LoaderFunction, redirect } from '@remix-run/node';
import { zfd } from 'zod-form-data';
import { v4 } from 'uuid';
import { AnyTaskEvent } from '../domain/events';
import { FossilStoreClient } from '../config/client';

const newTaskSchema = zfd.formData({
  name: zfd.text(),
});

export const loader: LoaderFunction = async ({ request }) => {
  if (request.method !== 'post') {
    return redirect('/');
  }

  return {};
};

export const action: ActionFunction = async ({ request }) => {
  const { name } = newTaskSchema.parse(await request.formData());
  const id = v4();

  const client = new FossilStoreClient();
  await client.appendEvents<AnyTaskEvent>(
    `Task-${id}`,
    [
      {
        type: 'TaskCreated',
        data: {
          name,
        },
      },
    ],
    // `-1` means that we expect this stream to NOT exist before writing in it. If it does,
    // the write operation will fail.
    -1
  );

  return redirect(`/tasks/${id}`);
};
