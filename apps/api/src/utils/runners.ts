import { INestApplication, Type } from '@nestjs/common';

export interface Runnable {
  run(abortSignal: AbortSignal, onEOF?: () => Promise<void>): Promise<void>;
}

interface RunnableWithAttributes<T> {
  run(
    attributes: T,
    abortSignal: AbortSignal,
    onEOF?: () => Promise<void>,
  ): Promise<void>;
}

export async function runUntilEof(runnable: Runnable): Promise<void> {
  const abortController = new AbortController();

  await runnable.run(abortController.signal, async () =>
    abortController.abort(),
  );
}

export async function runWithAttributesUntilEof<T>(
  runnable: RunnableWithAttributes<T>,
  attributes: T,
): Promise<void> {
  const abortController = new AbortController();

  await runnable.run(attributes, abortController.signal, async () =>
    abortController.abort(),
  );
}

export async function run(
  toBeApplication: Promise<INestApplication> | INestApplication,
  runnables: Type<Runnable>[],
) {
  const abortController = new AbortController();
  process.on('SIGINT', () => abortController.abort());
  process.on('SIGTERM', () => abortController.abort());

  const app = await toBeApplication;
  app.enableShutdownHooks();

  await Promise.race(
    runnables.map((r) => app.get(r).run(abortController.signal)),
  );

  abortController.abort();
}
