// TODO: fetch metrics from the SQS queue and
//       uses a `Gauge` for "# of messages to be consumed" and "(approx) age of oldest message"

import { Gauge } from 'prom-client';
import { GetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Pool } from 'pg';
import { Injectable } from '@nestjs/common';
import sql from 'sql-template-tag';

const approximateNumberOfMessagesToBeConsumed = new Gauge({
  name: 'fossil_subscription_approximate_number_of_messages_to_be_consumed',
  help: 'Approximate number of messages left to be consumed',
  labelNames: ['subscription_id'],
});

const approximateNumberOfMessagesBeingProcessed = new Gauge({
  name: 'fossil_subscription_approximate_number_of_messages_being_processed',
  help: 'Approximate number of messages currently being processed',
  labelNames: ['subscription_id'],
});

const approximateAgeOfOldestMessage = new Gauge({
  name: 'fossil_subscription_approximate_age_of_oldest_message',
  help: 'Approximate age of the oldest message',
  labelNames: ['subscription_id'],
});

/**
 * Important: This observer is not used yet.
 *
 * For the `ApproximateAgeOfOldestMessage` metric, we need to fetch it from CloudWatch's API
 * (@see https://github.com/aws/aws-sdk-go/issues/2526#issuecomment-476916929) so we're probably
 * better of fetching all metrics from there. However, the API costs roughly $10 per month per million
 * requests, so we want to limit the number of requests as much as possible.
 *
 * The minimum granularity we have is 1 min anyway, so we should only fetch once every minute. That's
 * roughly 60k per month, so assuming we can fetch all queues' metric in a single request, it's still
 * reasonably cheap.
 *
 * However, because we are not yet _sure_ to have customers using the SQS option... let's wait to have some
 * users using it and asking for these metrics.
 *
 */
@Injectable()
export class SQSTargetObserver {
  private subscriptionIdToQueueUrl = new Map<string, string>();

  constructor(
    private readonly sqsClient: SQSClient,
    private readonly pool: Pool,
  ) {}

  async observe(subscriptionId: string): Promise<void> {
    if (!this.subscriptionIdToQueueUrl.has(subscriptionId)) {
      const { rows } = await this.pool.query(
        sql`SELECT sqs_queue_url FROM sqs_subscriptions WHERE subscription_id = ${subscriptionId}`,
      );
      if (rows.length === 0) {
        throw new Error(
          `No SQS queue found for subscription ${subscriptionId}`,
        );
      }

      this.subscriptionIdToQueueUrl.set(subscriptionId, rows[0].sqs_queue_url);
    }

    const queueUrl = this.subscriptionIdToQueueUrl.get(subscriptionId);

    const { Attributes } = await this.sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: [
          'ApproximateNumberOfMessages',
          'ApproximateNumberOfMessagesNotVisible',
        ],
      }),
    );

    const labels = { subscription_id: subscriptionId };
    approximateNumberOfMessagesToBeConsumed.set(
      labels,
      Number(Attributes.ApproximateNumberOfMessages),
    );

    approximateNumberOfMessagesBeingProcessed.set(
      labels,
      Number(Attributes.ApproximateNumberOfMessagesNotVisible),
    );
  }
}
