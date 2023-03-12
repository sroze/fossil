import { IEventStore, StreamName } from 'event-store';
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
import { getSQSClient } from '../app';

export async function main(store: IEventStore, abortSignal: AbortSignal) {
  const subscription = new Subscription(
    store,
    new WithEventsCheckpointStore(store, 'SubscriptionManager-v4'),
    new CheckpointAfterNMessages(1)
  );

  await subscription.subscribeCategory<AnySubscriptionEvent>(
    'Subscription',
    async ({ data, type, stream_name }) => {
      const { identifier } = StreamName.decompose(stream_name);

      if (type === 'SubscriptionCreated') {
        const QueueName = `subscription-${identifier}.fifo`;
        const sqsClient = getSQSClient();

        try {
          await sqsClient.send(
            new GetQueueUrlCommand({
              QueueName,
            })
          );
        } catch (e) {
          if (e instanceof QueueDoesNotExist) {
            const { QueueUrl } = await sqsClient.send(
              new CreateQueueCommand({
                QueueName,
                Attributes: {
                  FifoQueue: 'true', // We care about the order.
                  MessageRetentionPeriod: '1209600', // 14 days, the maximum.
                },
              })
            );

            if (!QueueUrl) {
              throw new Error(`Could not get a queue URL when creating it.`);
            }

            await store.appendEvents<SubscriptionReady>(
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
              null
            );
          } else {
            throw e;
          }
        }
      }
    },
    abortSignal
  );
}
