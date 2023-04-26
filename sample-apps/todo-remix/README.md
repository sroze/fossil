# To-Do application with Remix

This application demonstrates multiple examples of using Fossil with Remix.

- A single task's events are stored in `Task-{id}` stream.
  - We use `expectedVersion` when appending to the store to have write concurrency controls.
  - We use client side stream-specific JWT tokens & Fossil's SSE to subscribe to the stream in the frontend.
- The list of tasks is an asynchronous projection, maintaining a list of tasks in a PostgreSQL table.

**Note:** they are many ways to implement this application (including ones that only use Fossil and
do not require a database). This is intended to demonstrate most fossil features.

## Getting started

```
pnpm dev
```
