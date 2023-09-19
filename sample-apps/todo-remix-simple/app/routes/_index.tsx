import type { LoaderFunction, V2_MetaFunction } from '@remix-run/node';
import { Form, useLoaderData, useNavigation } from '@remix-run/react';
import { read, ToDosState } from '../read-models/to-dos';
import { json } from '@remix-run/node';
import { ListItem } from '../components/tasks/list-item';

type LoaderData = {
  todos: ToDosState;
};

export const loader: LoaderFunction = async () => {
  const { state: todos } = await read();

  return json<LoaderData>({ todos });
};

export const meta: V2_MetaFunction = () => {
  return [{ title: "Fossil's Sample Application" }];
};

export default function Index() {
  const { todos } = useLoaderData<LoaderData>();

  return (
    <>
      <ul role="list" className="divide-y divide-gray-100">
        {todos.map((task) => (
          <li key={task.id} className="flex justify-between gap-x-6 py-2 group">
            <ListItem id={task.id} name={task.name} completed={false} />
            <div className="hidden group-hover:flex flex-col items-end">
              <a href={`/tasks/${task.id}`}>More</a>
            </div>
          </li>
        ))}
      </ul>

      <form
        action="/tasks"
        method="post"
        className="p-2 bg-gray-200 rounded-sm"
      >
        <input type="text" name="name" placeholder="Write your task..." />
        <button type="submit">Add</button>
      </form>
    </>
  );
}
