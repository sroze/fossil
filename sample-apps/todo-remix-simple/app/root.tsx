import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import stylesheet from './tailwind.css';
import type { LinksFunction } from '@remix-run/node';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <main className="p-24 w-full max-w-5xl text-sm m-auto">
          <div className="flex flex-row p-4">
            <div className="flex-1 justify-center">
              <a className="text-xl" href="/">
                Your list of things to do.
              </a>
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
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
