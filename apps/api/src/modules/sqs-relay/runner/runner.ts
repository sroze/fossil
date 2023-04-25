import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Inject, Injectable } from '@nestjs/common';
import { serializeEventInStoreForWire } from 'event-serialization';
import { DurableSubscriptionFactory } from '../../durable-subscription/factory';
import { StoreLocator } from 'store-locator';
import { aggregate as sqsRelay } from '../domain/decider';
import { EskitService } from '../../../utils/eskit-nest';

@Injectable()
export class SqsRelayRunner {
  constructor(
    private readonly storeLocator: StoreLocator,
    private readonly subscriptionFactory: DurableSubscriptionFactory,
    private readonly sqsClient: SQSClient,
    @Inject(sqsRelay.symbol)
    private readonly service: EskitService<typeof sqsRelay>,
  ) {}

  async run(id: string, abortSignal: AbortSignal, onEOF?: () => Promise<void>) {
    const { state } = await this.service.readOrFail(id);
    if (!state.sqs_queue_url) {
      throw new Error(
        'Queue is not ready. This code path should not have been called.',
      );
    }

    const subscription = await this.subscriptionFactory.readWrite(
      state.subscription_id,
    );

    // TODO: Explicit locking for each running subscription?
    // TODO: We need to be able to consume and produce by batch, for performance reasons.
    await subscription.start(
      {
        onMessage: async (event) => {
          await this.sqsClient.send(
            new SendMessageCommand({
              QueueUrl: state.sqs_queue_url,
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
