import { EventInStore, IEventStore, StreamName } from 'event-store';
import {
  CheckpointAfterNMessages,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import { AnySubscriptionEvent, SubscriptionReady } from '../domain/events';
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueUrlCommand,
  QueueDoesNotExist,
} from '@aws-sdk/client-sqs';
import { Inject, Injectable } from '@nestjs/common';
import { SystemStore } from '../../../symbols';

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
      new WithEventsCheckpointStore(this.store, 'SubscriptionManager-v4'),
      new CheckpointAfterNMessages(1),
    );

    await subscription.subscribeCategory<AnySubscriptionEvent>(
      'Subscription',
      { onMessage: (e) => this.handle(e), onEOF: () => onEOF && onEOF() },
      abortSignal,
    );
  }

  private async handle({
    data,
    type,
    stream_name,
  }: EventInStore<AnySubscriptionEvent>): Promise<void> {
    const { identifier } = StreamName.decompose(stream_name);

    if (type === 'SubscriptionCreated') {
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

          await this.store.appendEvents<SubscriptionReady>(
            stream_name,
            [
              {
                type: 'SubscriptionReady',
                data: {
                  store_id: data.store_id,
                  category: data.category,
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
