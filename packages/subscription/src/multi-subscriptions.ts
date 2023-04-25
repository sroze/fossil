import {
  asAdvancedHandler,
  Handler,
  SubscriptionInterface,
} from './subscription';
import { MinimumEventType } from 'event-store';
import { composeHandlers } from './utils';

export class MultiSubscriptions {
  constructor(private readonly subscriptions: SubscriptionInterface[]) {}

  async start<
    EventType extends MinimumEventType = MinimumEventType,
    ReturnType = void
  >(
    handler: Handler<EventType, ReturnType>,
    signal: AbortSignal
  ): Promise<void> {
    const advanced = asAdvancedHandler(handler);
    let eofCount = 0;

    await Promise.all(
      this.subscriptions.map((subscription) =>
        subscription.start(
          {
            onMessage: advanced.onMessage,
            onEOF: async (position) => {
              eofCount++;

              if (eofCount === this.subscriptions.length) {
                return advanced.onEOF(position);
              }
            },
          },
          signal
        )
      )
    );
  }
}
