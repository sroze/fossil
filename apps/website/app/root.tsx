import type { LinksFunction, MetaFunction } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

export const meta: MetaFunction = () => ({
  charset: 'utf-8',
  title: 'Fossil',
  viewport: 'width=device-width,initial-scale=1',
});

import styles from './styles/app.css';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }];

export default function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" className="h-full bg-white">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
