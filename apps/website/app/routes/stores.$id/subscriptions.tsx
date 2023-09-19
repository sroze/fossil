import { Table } from '../../modules/design-system/table';
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import React from 'react';
import { SubscriptionStatusBadge } from '~/modules/subscriptions/components/status-badge';
import { pool } from '~/config.backend';
import { SectionHeader } from '~/modules/design-system/section-header';
import { PrimaryLink } from '~/modules/design-system/buttons';
import {
  listSubscriptions,
  SubscriptionSummary,
} from '~/read-models/subscriptions';

type LoaderData = {
  store_id: string;
  subscriptions: SubscriptionSummary[];
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const subscriptions = await listSubscriptions(pool, params.id!);

  return json<LoaderData>({
    store_id: params.id!,
    subscriptions,
  });
};

export default function Subscriptions() {
  const { store_id, subscriptions } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <SectionHeader
        title="Durable subscriptions"
        subtitle="Funnel events to other processes or systems automatically and in order."
        right={
          <PrimaryLink href={`/stores/${store_id}/subscriptions/new`}>
            New subscription
          </PrimaryLink>
        }
      />

      <Table>
        <Table.Header>
          <tr>
            <Table.Header.Column>Name</Table.Header.Column>
            <Table.Header.Column>Category</Table.Header.Column>
            <Table.Header.Column>Target</Table.Header.Column>
            <Table.Header.Column></Table.Header.Column>
          </tr>
        </Table.Header>
        <Table.Body>
          {subscriptions.map((subscription) => (
            <tr key={subscription.subscription_id}>
              <Table.Column>
                <code>{subscription.name}</code>
              </Table.Column>
              <Table.Column>{subscription.category}</Table.Column>
              <Table.Column>{subscription.target}</Table.Column>
              <Table.Column>
                <a
                  href={`/stores/${store_id}/subscriptions/${subscription.subscription_id}`}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  View
                </a>
              </Table.Column>
            </tr>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
