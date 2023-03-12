import { expose } from 'threads/worker';
import {
  CheckpointAfterNMessages,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import { getSQSClient, getStoreLocator } from '../app';
import { SendMessageCommand } from '@aws-sdk/client-sqs';

// TODO: Explicit locking for each running subscription?

let abortController: AbortController;
let subscriptionPromise: Promise<void>;

export type StartSubscriptionCommand = {
  subscription_id: string;
  store_id: string;
  category: string;
  sqs_queue_url: string;
};

const task = {
  async start({
    store_id,
    subscription_id,
    category,
    sqs_queue_url,
  }: StartSubscriptionCommand) {
    abortController = new AbortController();

    const store = await getStoreLocator().locate(store_id);
    const subscription = new Subscription(
      store,
      new WithEventsCheckpointStore(
        store,
        `SubscriptionOffsets-${subscription_id}`
      ),
      // FIXME: We need more performant checkpointing mechanisms.
      new CheckpointAfterNMessages(1)
    );

    const client = getSQSClient();

    // TODO: We need to be able to consume and produce by batch, for performance reasons.
    subscriptionPromise = subscription.subscribeCategory(
      category,
      async (event) => {
        await client.send(
          new SendMessageCommand({
            QueueUrl: sqs_queue_url,
            MessageGroupId: event.stream_name,
            MessageDeduplicationId: event.id,
            MessageAttributes: {
              Type: { StringValue: event.type, DataType: 'String' },
            },
            MessageBody: JSON.stringify(event),
          })
        );
      },
      abortController.signal
    );
  },

  async stop() {
    abortController.abort();
    await subscriptionPromise;
  },
};

export type Task = typeof task;

expose(task);
