import {
  CheckpointAfterNMessages,
  InMemoryCheckpointStore,
  Subscription,
} from 'subscription';
import { ThreadSupervisor } from './threads/supervisor';
import { AnySubscriptionEvent } from '../domain/events';
import { IEventStore, StreamName } from 'event-store';
import { Inject, Injectable } from '@nestjs/common';
import { SystemStore } from '../../../symbols';

@Injectable()
export class RunningSubscriptionsManager {
  constructor(
    @Inject(SystemStore)
    private readonly store: IEventStore,
  ) {}

  async run(abortSignal: AbortSignal): Promise<void> {
    const subscription = new Subscription(
      this.store,
      // We don't want to store checkpoints really, every single time the supervisor is
      // starting, we want it to reconsume the overall state.
      new InMemoryCheckpointStore(),
      new CheckpointAfterNMessages(1),
    );

    const supervisor = new ThreadSupervisor();
    await subscription.subscribeCategory<AnySubscriptionEvent>(
      'Subscription',
      {
        onMessage: async ({ data, type, stream_name }) => {
          const { identifier } = StreamName.decompose(stream_name);

          if (type === 'SubscriptionReady') {
            await supervisor.addSubscription({
              store_id: data.store_id,
              subscription_id: identifier,
              subscription_category: data.category,
              sqs_queue_url: data.sqs_queue_url,
            });
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
