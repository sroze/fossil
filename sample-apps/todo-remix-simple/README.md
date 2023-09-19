# To-Do application with Remix

This application demonstrates multiple examples of using Fossil with Remix.

- A single task's events are stored in `Task-{id}` stream.
  - We use `expectedVersion` when appending to the store to have write concurrency controls.
  - We use client side stream-specific JWT tokens & Fossil's SSE to subscribe to the stream in the frontend.
- The list of tasks is an asynchronous projection.
  - It is stored in another stream `TaskList` and only the head is read to display the list.

**Note:** they are many ways to implement this application (including ones that only use Fossil and
do not require a database). It does not feature the usage of Fossil's `aggregate` feature, or the durable subscriptions.

## Installation

1. Create a store in Fossil and generate a management token (go to "Security" > "Generate token" and select `*` under "Management").
   Add the token to the `.env` file:
   ```
   FOSSIL_MANAGEMENT_TOKEN=...
   ```

## Getting started

```
pnpm dev
```
