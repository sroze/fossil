import {
  CheckpointAfterNMessages,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { StoreLocator } from 'store-locator';
import { Injectable } from '@nestjs/common';
import { SQSSubscriptionRow } from '../read-models/sqs-subscriptions';
import { serializeEventInStoreForWire } from 'event-serialization';

@Injectable()
export class SubscriptionRunner {
  constructor(
    private readonly storeLocator: StoreLocator,
    private readonly sqsClient: SQSClient,
  ) {}

  async run(
    {
      store_id,
      subscription_id,
      subscription_category,
      sqs_queue_url,
    }: SQSSubscriptionRow,
    abortSignal: AbortSignal,
    onEOF?: () => Promise<void>,
  ) {
    const store = await this.storeLocator.locate(store_id);
    const subscription = new Subscription(
      store,
      new WithEventsCheckpointStore(
        store,
        `SubscriptionOffsets-${subscription_id}`,
      ),
      // FIXME: We need more performant checkpointing mechanisms.
      new CheckpointAfterNMessages(1),
    );

    // TODO: Explicit locking for each running subscription?
    // TODO: We need to be able to consume and produce by batch, for performance reasons.
    await subscription.subscribeCategory(
      subscription_category,
      {
        onMessage: async (event) => {
          await this.sqsClient.send(
            new SendMessageCommand({
              QueueUrl: sqs_queue_url,
              MessageGroupId: event.stream_name,
              MessageDeduplicationId: event.id,
              MessageAttributes: {
                Type: { StringValue: event.type, DataType: 'String' },
              },
              MessageBody: JSON.stringify(serializeEventInStoreForWire(event)),
            }),
          );
        },
        onEOF: () => onEOF && onEOF(),
      },
      abortSignal,
    );
  }
}
