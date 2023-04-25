import { Inject, Injectable } from '@nestjs/common';
import { ReadOnly, WithEventsCheckpointStore } from 'subscription';
import { MonitoredSubscription } from './monitoring/monitored-subscription';
import { IEventStore } from 'event-store';
import { aggregate as durableSubscription } from './domain/aggregate';
import { EskitService } from '../../utils/eskit-nest';
import { StoreLocator } from 'store-locator';

@Injectable()
export class DurableSubscriptionFactory {
  constructor(
    @Inject(durableSubscription.symbol)
    private readonly service: EskitService<typeof durableSubscription>,
    private readonly storeLocator: StoreLocator,
  ) {}

  public async readOnly(subscriptionId: string) {
    const { state } = await this.service.readOrFail(subscriptionId);
    const store = await this.storeLocator.locate(state.store_id);

    return new MonitoredSubscription(
      store,
      subscriptionId,
      state.category,
      new ReadOnly(this.checkpointStore(store, subscriptionId)),
    );
  }

  public async readWrite(subscriptionId: string) {
    const { state } = await this.service.readOrFail(subscriptionId);
    const store = await this.storeLocator.locate(state.store_id);

    return new MonitoredSubscription(
      store,
      subscriptionId,
      state.category,
      this.checkpointStore(store, subscriptionId),
    );
  }

  private checkpointStore(store: IEventStore, subscriptionId: string) {
    return new WithEventsCheckpointStore(
      store,
      `$SubscriptionOffsets-${subscriptionId}`,
    );
  }
}
