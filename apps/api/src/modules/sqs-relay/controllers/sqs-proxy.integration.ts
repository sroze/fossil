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
import { PrepareQueueProcess } from '../processes/prepare-queue';
import { runUntilEof, runWithAttributesUntilEof } from '../../../utils/runners';
import { SystemStore } from '../../../symbols';
import { SqsRelayRunner } from '../runner/runner';
import { createSubscription } from '../../durable-subscription/utils/testing';
import request from 'supertest';

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
        read: { subscriptions: [subscriptionIdentifier] },
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

    describe('with a working relay', () => {
      let token: string;
      let receiptHandles: string[];

      beforeAll(async () => {
        // Create a subscription.
        await createSubscription(
          app.get<IEventStore>(SystemStore),
          storeId,
          subscriptionIdentifier,
          'Foo',
        );

        // Create the relay and request a queue.
        const { body: { id } } = await request(app.getHttpServer())
          .post(`/stores/${storeId}/sqs-relays`)
          .use(
            app.withToken(storeId, {
              management: ['subscriptions'],
            }),
          )
          .send({
            subscription_id: subscriptionIdentifier,
          })
          .expect(201);

        // Run the manager (to create the SQS queue) and read-models.
        await runUntilEof(app.get(PrepareQueueProcess));

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
        await runWithAttributesUntilEof(
          app.get(SqsRelayRunner),
          id,
        );

        // Generate a token able to operate on this subscription.
        token = await app.generateToken(storeId, {
          read: { subscriptions: [subscriptionIdentifier] },
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
