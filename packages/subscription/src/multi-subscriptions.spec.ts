import { MultiSubscriptions } from './multi-subscriptions';
import {
  AdvancedHandler,
  asAdvancedHandler,
  Handler,
  SubscriptionInterface,
} from './subscription';

class TestingSubscription implements SubscriptionInterface {
  private handler?: AdvancedHandler<any, any>;

  private actionsToBePerformed: Array<
    (handler: AdvancedHandler<any>) => Promise<void>
  > = [];
  private started: boolean = false;

  async start(handler: Handler<any, any>, signal: AbortSignal): Promise<void> {
    this.handler = asAdvancedHandler(handler);
    this.started = true;

    await this.performPendingActions();

    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve();
      }

      signal.addEventListener('abort', () => {
        resolve();
      });
    });
  }

  async produceMessage(message: any): Promise<void> {
    await this.performAction((handler) => handler.onMessage(message));
  }

  async produceEOF(position: bigint = 0n): Promise<void> {
    await this.performAction((handler) => handler.onEOF(position));
  }

  async performAction(
    action: (handler: AdvancedHandler<any>) => Promise<void>
  ): Promise<void> {
    if (this.started) {
      await action(this.handler!);
    } else {
      this.actionsToBePerformed.push(action);
    }
  }

  async performPendingActions(): Promise<void> {
    for (const action of this.actionsToBePerformed) {
      await action(this.handler!);
    }
  }
}

describe('Multi subscription', () => {
  it('enables to consume events from multiple subscriptions', async () => {
    const firstSubscription = new TestingSubscription();
    const secondSubscription = new TestingSubscription();

    const combined = new MultiSubscriptions([
      firstSubscription,
      secondSubscription,
    ]);

    const abortController = new AbortController();
    const handler = jest.fn();
    const promise = combined.start(handler, abortController.signal);

    await firstSubscription.produceMessage('first');
    await firstSubscription.produceEOF();
    await secondSubscription.produceMessage('second');
    await secondSubscription.produceEOF();
    await firstSubscription.produceMessage('third');
    await secondSubscription.produceMessage('fourth');

    abortController.abort();
    await promise;

    expect(handler).toHaveBeenNthCalledWith(1, 'first');
    expect(handler).toHaveBeenNthCalledWith(2, 'second');
    expect(handler).toHaveBeenNthCalledWith(3, 'third');
    expect(handler).toHaveBeenNthCalledWith(4, 'fourth');
  });

  it('calls onEOF handler with the last position', async () => {
    const firstSubscription = new TestingSubscription();
    const secondSubscription = new TestingSubscription();

    const combined = new MultiSubscriptions([
      firstSubscription,
      secondSubscription,
    ]);

    const abortController = new AbortController();
    const onMessage = jest.fn();
    const onEOF = jest.fn();

    const promise = combined.start(
      { onMessage, onEOF },
      abortController.signal
    );

    await firstSubscription.produceMessage('first');
    await firstSubscription.produceEOF();
    await secondSubscription.produceMessage('second');
    await secondSubscription.produceEOF();

    abortController.abort();
    await promise;

    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onEOF).toHaveBeenCalledTimes(1);
  });
});
