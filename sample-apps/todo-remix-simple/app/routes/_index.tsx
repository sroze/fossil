import type { V2_MetaFunction } from '@remix-run/node';
import { Form, useNavigation } from '@remix-run/react';

export const meta: V2_MetaFunction = () => {
  return [{ title: "Fossil's Sample Application" }];
};

export default function Index() {
  return (
    <main className="p-24 w-full max-w-5xl text-sm m-auto">
      <div className="flex flex-row p-4">
        <div className="flex-1 justify-center">
          <p className="text-xl">Your list of things to do.</p>
          <div className="text-sm text-gray-500">
            A typical demo application.
          </div>
        </div>
        <div className="h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none font-mono flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
          >
            Using{' '}
            <span className="inline-block p-2 rounded-md bg-slate-100 hover:bg-slate-200">
              🪨
            </span>
          </a>
        </div>
      </div>

      <form
        action="/tasks"
        method="post"
        className="p-2 bg-gray-200 rounded-sm"
      >
        <input type="text" name="name" placeholder="Write your task..." />
        <button type="submit">Add</button>
      </form>
    </main>
  );
}
