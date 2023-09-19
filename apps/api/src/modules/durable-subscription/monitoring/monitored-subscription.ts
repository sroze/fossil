import {
  Handler,
  composeHandlers,
  Subscription,
  ICheckpointStore,
} from 'subscription';
import { IEventStore, MinimumEventType } from 'event-store';
import { Counter, Gauge } from 'prom-client';
import { measureEvents, offHotPath } from '../../../utils/monitoring';
import { LagObserver } from './lag-observer';
import { CheckpointStoreWithCallback } from './checkpoint-store-with-callback';

const subscriptionEvents = new Counter({
  name: 'fossil_subscription_receive_events',
  help: 'Number of events received by a subscription',
  labelNames: ['subscription_id'],
});

const subscriptionBytes = new Counter({
  name: 'fossil_subscription_receive_bytes',
  help: 'Number of bytes received by a subscription',
  labelNames: ['subscription_id'],
});

const timestampOfLastProcessedEvent = new Gauge({
  name: 'fossil_subscription_receive_last_processed_event_timestamp',
  help: 'Age of the last processed event (in ms)',
  labelNames: ['subscription_id'],
});

export class MonitoredSubscription {
  private readonly subscription: Subscription;
  private readonly lagObserver: LagObserver;
  private readonly checkpointStore: ICheckpointStore;
  private readonly labels: { subscription_id: string };

  constructor(
    private readonly eventStore: IEventStore,
    private readonly subscriptionId: string,
    private readonly category: string,
    checkpointStore: ICheckpointStore,
  ) {
    this.labels = { subscription_id: subscriptionId };
    this.lagObserver = new LagObserver(eventStore, category, this.labels);
    this.checkpointStore = new CheckpointStoreWithCallback(
      checkpointStore,
      (position) => this.lagObserver.observe(position),
    );
    this.subscription = new Subscription(
      eventStore,
      { category },
      {
        checkpointStore: this.checkpointStore,
      },
    );
  }

  async start<EventType extends MinimumEventType, ReturnType = void>(
    handler: Handler<EventType, ReturnType>,
    signal: AbortSignal,
  ): Promise<void> {
    void this.lagObserver.observe(await this.checkpointStore.getCheckpoint());

    await this.subscription.start(
      composeHandlers(handler, {
        onMessage: async (event) => {
          offHotPath(() => {
            measureEvents(subscriptionBytes, subscriptionEvents, this.labels, [
              event,
            ]);

            timestampOfLastProcessedEvent.set(
              this.labels,
              event.time.valueOf(),
            );
          });
        },
      }),
      signal,
    );
  }

  async commit(position: bigint) {
    await this.checkpointStore.storeCheckpoint(position);
  }
}
