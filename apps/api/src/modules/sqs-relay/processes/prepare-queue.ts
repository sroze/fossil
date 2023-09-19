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
import { AnySQSTargetEvent } from '../domain/events';
import { SqsRelay } from '../domain/category';
import { aggregate as sqsRelay } from '../domain/decider';
import { EskitService } from '../../../utils/eskit-nest';

@Injectable()
export class PrepareQueueProcess {
  constructor(
    @Inject(SystemStore)
    private readonly store: IEventStore,
    private readonly sqsClient: SQSClient,
    @Inject(sqsRelay.symbol)
    private readonly service: EskitService<typeof sqsRelay>,
  ) {}

  async run(
    abortSignal: AbortSignal,
    onEOF?: () => Promise<void>,
  ): Promise<void> {
    const subscription = new Subscription(
      this.store,
      { category: SqsRelay.toString() },
      {
        checkpointStore: new WithEventsCheckpointStore(
          this.store,
          '$Offsets-SqsRelay-QueueManager-v1',
        ),
      },
    );

    await subscription.start<AnySQSTargetEvent>(
      { onMessage: (e) => this.handle(e), onEOF: () => onEOF && onEOF() },
      abortSignal,
    );
  }

  private async handle({
    data,
    type,
    stream_name,
  }: EventInStore<AnySQSTargetEvent>): Promise<void> {
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

          await this.service.execute(identifier, {
            type: 'MarkSqsQueueAsCreated',
            data: {
              sqs_queue_url: QueueUrl,
            },
          });
        } else {
          throw e;
        }
      }
    }
  }
}
