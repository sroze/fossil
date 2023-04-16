import { Injectable } from '@nestjs/common';
import { ReadOnly, WithEventsCheckpointStore } from 'subscription';
import { MonitoredSubscription } from './monitoring/monitored-subscription';
import { IEventStore } from 'event-store';

@Injectable()
export class DurableSubscriptionFactory {
  public checkpointStore(store: IEventStore, subscriptionId: string) {
    return new WithEventsCheckpointStore(
      store,
      // TODO: Prefix with `$` and hide these streams from the user (optionally).
      `SubscriptionOffsets-${subscriptionId}`,
    );
  }

  public readOnly(
    store: IEventStore,
    subscriptionId: string,
    category: string,
  ) {
    return new MonitoredSubscription(
      store,
      subscriptionId,
      category,
      new ReadOnly(this.checkpointStore(store, subscriptionId)),
    );
  }

  public readWrite(
    store: IEventStore,
    subscriptionId: string,
    category: string,
  ) {
    return new MonitoredSubscription(
      store,
      subscriptionId,
      category,
      this.checkpointStore(store, subscriptionId),
    );
  }
}
