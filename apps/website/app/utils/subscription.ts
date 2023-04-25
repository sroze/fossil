import { MinimumEventType } from 'event-store';
import {
  asAdvancedHandler,
  Handler,
  composeHandlers,
  SubscriptionInterface,
} from 'subscription';

export type RunnableSubscription<
  T extends MinimumEventType,
  ReturnType = void
> = {
  subscription: SubscriptionInterface;
  handler: Handler<T, ReturnType>;
};

export async function runSubscription<T extends MinimumEventType, ReturnType>(
  runnable: RunnableSubscription<T, ReturnType>,
  abortSignal: AbortSignal
) {
  await runnable.subscription.start(runnable.handler, abortSignal);
}

export async function runUntilEof<T extends MinimumEventType, ReturnType>(
  { subscription, handler }: RunnableSubscription<T, ReturnType>,
  timeoutInMs: number
): Promise<void> {
  await subscribeUntil(
    subscription,
    composeHandlers(handler, { onEOF: async () => true }),
    timeoutInMs
  );
}

export class ConditionNotReachedError extends Error {}

export async function subscribeUntil<
  EventType extends MinimumEventType,
  ReturnType
>(
  subscription: SubscriptionInterface,
  handler: Handler<EventType, ReturnType>,
  timeoutInMs: number
): Promise<NonNullable<ReturnType>> {
  const controller = new AbortController();

  // Start the timer
  const timeout = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutInMs);

  const advancedHandler = asAdvancedHandler(handler);
  let lastResult: ReturnType | void;
  try {
    await subscription.start<EventType>(
      {
        onMessage: async (event) => {
          lastResult = await advancedHandler.onMessage(event);

          if (lastResult) {
            controller.abort();
          }
        },
        onEOF: async (position) => {
          lastResult = await advancedHandler.onEOF(position);

          if (lastResult) {
            controller.abort();
          }
        },
      },
      controller.signal
    );

    if (lastResult!) {
      return lastResult;
    }

    throw new ConditionNotReachedError('Condition was not reached.');
  } finally {
    clearTimeout(timeout);
  }
}
