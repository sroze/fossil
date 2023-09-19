import { InMemoryCheckpointStore, Subscription } from 'subscription';
import { ThreadSupervisor } from './threads/supervisor';
import { IEventStore, StreamName } from 'event-store';
import { Inject, Injectable } from '@nestjs/common';
import { SystemStore } from '../../../symbols';
import { AnySQSTargetEvent } from '../domain/events';
import { SqsRelay } from '../domain/category';

@Injectable()
export class RunningSubscriptionsManager {
  constructor(
    @Inject(SystemStore)
    private readonly store: IEventStore,
  ) {}

  async run(abortSignal: AbortSignal): Promise<void> {
    const subscription = new Subscription(
      this.store,
      { category: SqsRelay.toString() },
      // We don't want to store checkpoints really, every single time the supervisor is
      // starting, we want it to reconsume the overall state.
      { checkpointStore: new InMemoryCheckpointStore() },
    );

    const supervisor = new ThreadSupervisor();
    await subscription.start<AnySQSTargetEvent>(
      {
        onMessage: async ({ data, type, stream_name }) => {
          const { identifier } = StreamName.decompose(stream_name);

          if (type === 'SQSQueueCreated') {
            await supervisor.addRelay(identifier);
          } else if (type === 'SqsRelayDeleted') {
            await supervisor.removeRelay(identifier);
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
