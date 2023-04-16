import { EventInStore, IEventStore, StreamName } from 'event-store';
import { Subscription, WithEventsCheckpointStore } from 'subscription';
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueUrlCommand,
  QueueDoesNotExist,
} from '@aws-sdk/client-sqs';
import { Inject, Injectable } from '@nestjs/common';
import { SystemStore } from '../../../symbols';
import { AnySQSSubscriptionEvent, SQSQueueCreated } from '../domain/events';

@Injectable()
export class PrepareSubscriptionProcess {
  constructor(
    @Inject(SystemStore)
    private readonly store: IEventStore,
    private readonly sqsClient: SQSClient,
  ) {}

  async run(
    abortSignal: AbortSignal,
    onEOF?: () => Promise<void>,
  ): Promise<void> {
    const subscription = new Subscription(
      this.store,
      { category: 'Subscription' },
      {
        checkpointStore: new WithEventsCheckpointStore(
          this.store,
          'SubscriptionManager-v4',
        ),
      },
    );

    await subscription.start<AnySQSSubscriptionEvent>(
      { onMessage: (e) => this.handle(e), onEOF: () => onEOF && onEOF() },
      abortSignal,
    );
  }

  private async handle({
    data,
    type,
    stream_name,
  }: EventInStore<AnySQSSubscriptionEvent>): Promise<void> {
    const { identifier } = StreamName.decompose(stream_name);

    if (type === 'SQSQueueRequested') {
      const QueueName = `subscription-${identifier}.fifo`;

      try {
        await this.sqsClient.send(
          new GetQueueUrlCommand({
            QueueName,
          }),
        );
      } catch (e) {
        if (e instanceof QueueDoesNotExist) {
          const { QueueUrl } = await this.sqsClient.send(
            new CreateQueueCommand({
              QueueName,
              Attributes: {
                FifoQueue: 'true', // We care about the order.
                MessageRetentionPeriod: '1209600', // 14 days, the maximum.
              },
            }),
          );

          if (!QueueUrl) {
            throw new Error(`Could not get a queue URL when creating it.`);
          }

          await this.store.appendEvents<SQSQueueCreated>(
            stream_name,
            [
              {
                type: 'SQSQueueCreated',
                data: {
                  sqs_queue_url: QueueUrl,
                },
              },
            ],
            null,
          );
        } else {
          throw e;
        }
      }
    }
  }
}
