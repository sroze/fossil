import { H2 } from '../../modules/design-system/h2';
import { Table } from '../../modules/design-system/table';
import { ButtonAndPopup } from '~/modules/design-system/button-and-popup';
import { ActionFunction, json, LoaderFunction } from '@remix-run/node';
import { NewSubscriptionForm } from '~/modules/subscriptions/organisms/new-subscription-form';
import { useLoaderData } from '@remix-run/react';
import { DurableSubscriptionService } from '~/modules/subscriptions/service';
import { validationError } from 'remix-validated-form';
import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import sql from 'sql-template-tag';
import React from 'react';
import { SubscriptionStatusBadge } from '~/modules/subscriptions/components/status-badge';
import { pool } from '~/config.backend';

export const createSubscriptionValidator = withZod(
  z.object({
    name: z.string(),
    category: z.string(),
  })
);

export const action: ActionFunction = async ({ request, params }) => {
  const { data, error } = await createSubscriptionValidator.validate(
    await request.formData()
  );
  if (error) {
    return validationError(error);
  }

  const identifier = await DurableSubscriptionService.resolve().create({
    ...data,
    store_id: params.id!,
  });

  return json({
    identifier,
  });
};

type SubscriptionSummary = {
  subscription_id: string;
  name: string;
  category: string;
  status: string;
};

type LoaderData = {
  store_id: string;
  subscriptions: SubscriptionSummary[];
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const { rows: subscriptions } = await pool.query<SubscriptionSummary>(
    sql`SELECT subscription_id, name, category, status FROM subscriptions WHERE store_id = ${params.id!}`
  );

  return json<LoaderData>({
    store_id: params.id!,
    subscriptions,
  });
};

export default function Subscriptions() {
  const { store_id, subscriptions } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <div className="float-right">
        <ButtonAndPopup title="New subscription" variant="primary">
          <NewSubscriptionForm store_id={store_id} />
        </ButtonAndPopup>
      </div>

      <H2>Durable subscriptions</H2>
      <div>
        Funnel events to other processes or systems automatically and in order.
      </div>

      <Table>
        <Table.Header>
          <tr>
            <Table.Header.Column>Name</Table.Header.Column>
            <Table.Header.Column>Category</Table.Header.Column>
            <Table.Header.Column>Status</Table.Header.Column>
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
              <Table.Column>
                <SubscriptionStatusBadge status={subscription.status} />
              </Table.Column>
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
