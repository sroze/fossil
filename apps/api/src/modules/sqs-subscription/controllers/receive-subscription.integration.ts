import { TestApplication } from '../../../../test/test-application';
import {
  ChangeMessageVisibilityBatchCommand,
  ChangeMessageVisibilityCommand,
  DeleteMessageBatchCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { requestOptionsFromApp } from '../../../../test/request';
import { IEventStore } from 'event-store';
import { v4 } from 'uuid';
import { StoreLocator } from 'store-locator';
import { AnySubscriptionEvent } from '../domain/events';
import { PrepareSubscriptionProcess } from '../processes/prepare-subscription';
import {
  SQSSubscriptionRow,
  SqsSubscriptionsReadModel,
} from '../read-models/sqs-subscriptions';
import { runUntilEof, runWithAttributesUntilEof } from '../../../utils/runners';
import { SystemDatabasePool, SystemStore } from '../../../symbols';
import { SubscriptionRunner } from '../runner/runner';
import { Pool } from 'pg';
import sql from 'sql-template-tag';

describe('Receives from a subscription', () => {
  const storeId = v4();
  const subscriptionIdentifier = v4();
  let app: TestApplication;

  beforeAll(async () => {
    app = await TestApplication.create().init(storeId);
  });

  afterAll(async () => {
    await app.close();
  });

  const sqsClientWithToken = (token: string, storeId: string): SQSClient => {
    const { hostname, port } = requestOptionsFromApp(app);

    return new SQSClient({
      credentials: {
        accessKeyId: 'ignored',
        secretAccessKey: 'ignored',
        sessionToken: token,
      },
      region: 'eu-west-2',
      endpoint: `http://${hostname}:${port}/stores/${storeId}/sqs`,
    });
  };

  describe("matches AWS's SQS API", () => {
    it('refuses an invalid token', async () => {
      await expect(() =>
        sqsClientWithToken('THIS-MIGHT-BE-BETTER', storeId).send(
          new ReceiveMessageCommand({
            QueueUrl: `subscription#${subscriptionIdentifier}`,
            MaxNumberOfMessages: 10,
          }),
        ),
      ).rejects.toThrowError('Provided token was invalid');
    });

    it('refuses a token crafted for another store', async () => {
      const token = await app.generateToken('987', {
        read: { streams: [`Foo-*`] },
      });

      await expect(() =>
        sqsClientWithToken(token, storeId).send(
          new ReceiveMessageCommand({
            QueueUrl: `subscription#${subscriptionIdentifier}`,
            MaxNumberOfMessages: 10,
          }),
        ),
      ).rejects.toThrowError(
        'This token was not intended to be used on this store',
      );
    });

    it.todo(
      'does not have the necessary claims to read from this subscription',
    );

    describe('with a working subscription', () => {
      let token: string;
      let receiptHandles: string[];

      beforeAll(async () => {
        // Create a subscription.
        const systemStore: IEventStore = app.get(SystemStore);
        await systemStore.appendEvents<AnySubscriptionEvent>(
          `Subscription-${subscriptionIdentifier}`,
          [
            {
              type: 'SubscriptionCreated',
              data: {
                store_id: storeId,
                type: 'managed-queue',
                category: 'Foo',
                name: 'My subscription',
              },
            },
          ],
          -1n,
        );

        // Run the manager (to create the SQS queue) and read-models.
        await runUntilEof(app.get(PrepareSubscriptionProcess));
        await runUntilEof(app.get(SqsSubscriptionsReadModel));

        // Add a bunch of events to the store
        const store = await app.get(StoreLocator).locate(storeId);
        await store.appendEvents(
          `Foo-123`,
          [{ type: 'Foo', data: [1, 2] }],
          -1n,
        );
        await store.appendEvents(
          `Foo-879`,
          [{ type: 'Foo', data: [3, 4] }],
          -1n,
        );

        // Run the subscription
        const pool: Pool = app.get(SystemDatabasePool);
        const {
          rows: [subscription],
        } = await pool.query<SQSSubscriptionRow>(
          sql`SELECT * FROM sqs_subscriptions WHERE store_id = ${storeId} AND subscription_id = ${subscriptionIdentifier}`,
        );
        await runWithAttributesUntilEof(
          app.get(SubscriptionRunner),
          subscription,
        );

        // Generate a token able to operate on this subscription.
        token = await app.generateToken(storeId, {
          read: { streams: [`Foo-*`] },
        });
      });

      it('receives a message', async () => {
        const { Messages } = await sqsClientWithToken(token, storeId).send(
          new ReceiveMessageCommand({
            QueueUrl: `subscription#${subscriptionIdentifier}`,
            MaxNumberOfMessages: 10,
          }),
        );

        expect(Messages).toHaveLength(2);

        const bodiesData = Messages.map((m) => JSON.parse(m.Body).data);
        expect(bodiesData).toEqual([
          [1, 2],
          [3, 4],
        ]);

        receiptHandles = Messages.map((m) => m.ReceiptHandle);
      });

      it('ChangeMessageVisibility', async () => {
        expect(receiptHandles).toHaveLength(2);

        await sqsClientWithToken(token, storeId).send(
          new ChangeMessageVisibilityCommand({
            QueueUrl: `subscription#${subscriptionIdentifier}`,
            ReceiptHandle: receiptHandles[0],
            VisibilityTimeout: 10,
          }),
        );
      });

      it('ChangeMessageVisibilityBatch', async () => {
        expect(receiptHandles).toHaveLength(2);

        await sqsClientWithToken(token, storeId).send(
          new ChangeMessageVisibilityBatchCommand({
            QueueUrl: `subscription#${subscriptionIdentifier}`,
            Entries: receiptHandles.map((entry, index) => ({
              Id: `Idx${index}`,
              ReceiptHandle: entry,
              VisibilityTimeout: 10,
            })),
          }),
        );
      });

      it('DeleteMessage', async () => {
        expect(receiptHandles).toHaveLength(2);

        await sqsClientWithToken(token, storeId).send(
          new DeleteMessageCommand({
            QueueUrl: `subscription#${subscriptionIdentifier}`,
            ReceiptHandle: receiptHandles[0],
          }),
        );
      });

      it('DeleteMessageBatch', async () => {
        expect(receiptHandles).toHaveLength(2);

        await sqsClientWithToken(token, storeId).send(
          new DeleteMessageBatchCommand({
            QueueUrl: `subscription#${subscriptionIdentifier}`,
            Entries: receiptHandles.map((entry, index) => ({
              Id: `Idx${index}`,
              ReceiptHandle: entry,
            })),
          }),
        );
      });
    });
  });
});
