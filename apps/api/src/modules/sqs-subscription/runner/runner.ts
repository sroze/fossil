import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Injectable } from '@nestjs/common';
import { SQSSubscriptionRow } from '../read-models/sqs-subscriptions';
import { serializeEventInStoreForWire } from 'event-serialization';
import { DurableSubscriptionFactory } from '../../durable-subscription/factory';
import { StoreLocator } from 'store-locator';

@Injectable()
export class SubscriptionRunner {
  constructor(
    private readonly storeLocator: StoreLocator,
    private readonly subscriptionFactory: DurableSubscriptionFactory,
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
    const subscription = await this.subscriptionFactory.readWrite(
      await this.storeLocator.locate(store_id),
      subscription_id,
      subscription_category,
    );

    // TODO: Explicit locking for each running subscription?
    // TODO: We need to be able to consume and produce by batch, for performance reasons.
    await subscription.start(
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
