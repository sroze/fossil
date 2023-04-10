import { useLoaderData } from '@remix-run/react';
import { H2 } from '~/modules/design-system/h2';
import React from 'react';
import { json, LoaderFunction } from '@remix-run/node';
import sql from 'sql-template-tag';
import { SubscriptionStatusBadge } from '~/modules/subscriptions/components/status-badge';
import { storeApiBaseUrl } from '~/modules/api-client/config';
import { generatePlaygroundToken } from '~/modules/playground/backend/token-generator';
import { pool } from '~/config.backend';
import { SectionHeader } from '~/modules/design-system/section-header';
import { ButtonAndPopup } from '~/modules/design-system/button-and-popup';
import { DangerButton } from '~/modules/design-system/buttons';

type SubscriptionSummary = {
  subscription_id: string;
  name: string;
  category: string;
  status: string;
};

type LoaderData = {
  store_id: string;
  subscription: SubscriptionSummary;
  token: string;
};

export const loader: LoaderFunction = async ({ params }) => {
  const {
    rows: [subscription],
  } = await pool.query<SubscriptionSummary>(
    sql`SELECT subscription_id, name, category, status FROM subscriptions WHERE store_id = ${params.id!}`
  );

  if (!subscription) {
    throw new Error(`Subscription was not found.`);
  }

  return json<LoaderData>({
    store_id: params.id!,
    subscription,
    token: await generatePlaygroundToken(params.id!),
  });
};

export default function Subscriptions() {
  const { store_id, subscription, token } = useLoaderData<LoaderData>();

  const code = `const {ReceiveMessageCommand, SQSClient, DeleteMessageBatchCommand} = require("@aws-sdk/client-sqs");

const QueueUrl = \`subscription#${subscription.subscription_id}\`;
const token = \`${token}\`;
const client = new SQSClient({
  credentials: {
    accessKeyId: 'ignored',
    secretAccessKey: 'ignored',
    sessionToken: token,
  },
  region: 'eu-west-2',
  endpoint: \`${storeApiBaseUrl}/stores/${store_id}/sqs\`,
});

(async () => {
  while (true) {
    const { Messages } = await client.send(new ReceiveMessageCommand({
      QueueUrl,
    }));

    if (!Messages) {
      continue;
    }

    // Do something about \`Messages\`...
    console.log(Messages);

    // Remove them from the queue (aka "mark them as completed")
    await client.send(new DeleteMessageBatchCommand({
      QueueUrl,
      Entries: Messages.map((message, index) => ({
        Id: \`Idx\${index}\`,
        ReceiptHandle: message.ReceiptHandle,
      }))
    }));
  }
})();`;

  return (
    <div className="p-5">
      <SectionHeader
        title={`Subscription "${subscription.name}"`}
        subtitle={<SubscriptionStatusBadge status={subscription.status} />}
        right={
          <ButtonAndPopup title="Delete subscription" variant="danger">
            <form
              action={`/stores/${store_id}/subscriptions/${subscription.subscription_id}/delete`}
              method="post"
            >
              <div className="relative flex items-start mb-5">
                <div className="flex h-6 items-center">
                  <input
                    id="confirm"
                    name="confirm"
                    value="yes"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>
                <div className="ml-3 text-sm leading-6">
                  <label
                    htmlFor="confirm"
                    className="font-medium text-gray-900"
                  >
                    I confirm
                  </label>{' '}
                  <span id="comments-description" className="text-gray-500">
                    that I want to delete this subscription.
                  </span>
                </div>
              </div>

              <DangerButton type="submit">Delete</DangerButton>
            </form>
          </ButtonAndPopup>
        }
      />

      <p className="py-2">
        <strong>Category:</strong> {subscription.category}
      </p>
      <p className="py-2">Try the following code:</p>
      <pre>{code}</pre>
    </div>
  );
}
