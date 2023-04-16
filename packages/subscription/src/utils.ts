import { MinimumEventType } from 'event-store';
import {
  AdvancedHandler,
  asAdvancedHandler,
  MessageFunctionHandler,
} from './subscription';

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
