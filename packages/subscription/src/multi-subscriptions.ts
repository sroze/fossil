import { Handler, SubscriptionInterface } from './subscription';
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
    await Promise.all(
      this.subscriptions.map((subscription) =>
        subscription.start(handler, signal)
      )
    );
  }
}
