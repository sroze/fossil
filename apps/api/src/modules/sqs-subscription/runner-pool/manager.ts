import { InMemoryCheckpointStore, Subscription } from 'subscription';
import { ThreadSupervisor } from './threads/supervisor';
import { AnySubscriptionEvent } from '../../durable-subscription/domain/events';
import { IEventStore, StreamName } from 'event-store';
import { Inject, Injectable } from '@nestjs/common';
import { SystemStore } from '../../../symbols';
import { AnySQSSubscriptionEvent } from '../domain/events';

@Injectable()
export class RunningSubscriptionsManager {
  constructor(
    @Inject(SystemStore)
    private readonly store: IEventStore,
  ) {}

  async run(abortSignal: AbortSignal): Promise<void> {
    const subscription = new Subscription(
      this.store,
      { category: 'Subscription' },
      // We don't want to store checkpoints really, every single time the supervisor is
      // starting, we want it to reconsume the overall state.
      { checkpointStore: new InMemoryCheckpointStore() },
    );

    const subscriptionMetadata = new Map<
      string,
      { store_id: string; category: string }
    >();

    const supervisor = new ThreadSupervisor();
    await subscription.start<AnySubscriptionEvent | AnySQSSubscriptionEvent>(
      {
        onMessage: async ({ data, type, stream_name }) => {
          const { identifier } = StreamName.decompose(stream_name);

          if (type === 'SubscriptionCreated') {
            subscriptionMetadata.set(identifier, {
              store_id: data.store_id,
              category: data.category,
            });
          } else if (type === 'SQSQueueCreated') {
            const metadata = subscriptionMetadata.get(identifier);
            if (!metadata) {
              throw new Error(
                `No metadata found for subscription ${identifier}`,
              );
            }

            await supervisor.addSubscription({
              subscription_id: identifier,
              store_id: metadata.store_id,
              subscription_category: metadata.category,
              sqs_queue_url: data.sqs_queue_url,
            });
          } else if (type === 'SubscriptionDeleted') {
            await supervisor.removeSubscription(identifier);
          }
        },
        onEOF: async () => {
          await supervisor.start();
        },
      },
      abortSignal,
    );

    await supervisor.end();
  }
}
