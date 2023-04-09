import { MinimumEventType } from 'event-store';
import {
  AdvancedHandler,
  asAdvancedHandler,
  Handler,
  MessageFunctionHandler,
  Subscription,
} from 'subscription';

export type RunnableSubscription<
  T extends MinimumEventType,
  ReturnType = void
> = {
  subscription: Subscription;
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
  subscription: Subscription,
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

type PossibleHandler<EventType extends MinimumEventType, ReturnType> =
  | MessageFunctionHandler<EventType, ReturnType>
  | Partial<AdvancedHandler<EventType, ReturnType>>;

export function composeHandlers<
  EventType extends MinimumEventType,
  ReturnType = void
>(
  ...handlers: [
    ...PossibleHandler<EventType, any>[],
    PossibleHandler<EventType, ReturnType>
  ]
): AdvancedHandler<EventType, ReturnType | undefined> {
  const advancedHandlers = handlers.map(asAdvancedHandler);

  return {
    onMessage: async (event) => {
      let lastResult: ReturnType | void;
      for (const handler of advancedHandlers) {
        lastResult = await handler.onMessage(event);
      }

      return lastResult ?? undefined;
    },
    onEOF: async (position) => {
      let lastResult: ReturnType | void;
      for (const handler of advancedHandlers) {
        lastResult = await handler.onEOF(position);
      }

      return lastResult ?? undefined;
    },
  };
}
