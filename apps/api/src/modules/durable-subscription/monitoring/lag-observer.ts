import { IEventStore } from 'event-store';
import { Gauge } from 'prom-client';

const lagEventsCount = new Gauge({
  name: 'fossil_subscription_lag_events_count',
  help: 'Number of events after the last checkpoint',
  labelNames: ['subscription_id'],
});

const lagOldestEventAge = new Gauge({
  name: 'fossil_subscription_lag_oldest_event_timestamp',
  help: 'Timestamp of the oldest event after the last checkpoint',
  labelNames: ['subscription_id'],
});

export class LagObserver {
  // This ensures we only have a single 'observe' call at a time.
  private singleton: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: IEventStore,
    private readonly category: string,
    private readonly labels: { subscription_id: string },
  ) {}

  async observe(position: bigint): Promise<void> {
    return new Promise((resolve, reject) => {
      this.singleton = this.singleton.then(() =>
        this.doObserve(position)
          .then(resolve, reject)
          .catch(() => {
            // no-op, we ignore the error for the singleton.
          }),
      );
    });
  }

  private async doObserve(position: bigint): Promise<void> {
    // TODO: when this "lag observer" is used by client-driven offset tracking, it will
    //       have to do through something like Prometheus Pushgateway, as the client
    //       will not be able to reach the Prometheus server and the metric has to be
    //       centralised, somewhere!
    const stats = await this.store.statisticsAtPosition(
      this.category,
      position,
    );

    lagEventsCount.set(this.labels, stats.approximate_event_count_after);

    if (stats.approximate_event_timestamp) {
      lagOldestEventAge.set(
        this.labels,
        stats.approximate_event_timestamp.valueOf(),
      );
    }
  }
}
