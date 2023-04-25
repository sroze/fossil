import { SectionHeader } from '~/modules/design-system/section-header';
import { FormInput } from '~/modules/zod-forms/components/input';
import { SubmitButton } from '~/modules/zod-forms/components/submit-button';
import { ValidatedForm, validationError } from 'remix-validated-form';
import React from 'react';
import { ActionFunction, LoaderFunction, redirect } from '@remix-run/node';
import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import {
  ArrowDownOnSquareIcon,
  ArrowsPointingOutIcon,
  BackwardIcon,
  CalendarDaysIcon,
  CameraIcon,
  FingerPrintIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/solid';
import { RadioFieldset } from '~/modules/zod-forms/components/radio-fieldset';
import { categorySchema } from '~/modules/api-client/write';
import { generateManagementToken } from '~/modules/playground/backend/token-generator';
import { SqsRelayApi, SubscriptionsApi } from 'fossil-api-client';
import { storeApiBaseUrl } from '~/modules/api-client/config';
import { Card } from '~/modules/design-system/card';

export const createSubscriptionValidator = withZod(
  z.object({
    name: z.string(),
    category: categorySchema,
    initial_position: z.enum(['beginning']),
    target: z.enum(['poll', 'managed-sqs']),
  })
);

export const action: ActionFunction = async ({ request, params }) => {
  const storeId = params.id!;
  const { data, error } = await createSubscriptionValidator.validate(
    await request.formData()
  );
  if (error) {
    return validationError(error);
  }

  // 1. generate a token that can manage subscriptions
  const token = await generateManagementToken(storeId);
  const subscriptionsClient = new SubscriptionsApi(undefined, storeApiBaseUrl);

  const {
    data: { id, global_position },
  } = await subscriptionsClient.createSubscription(
    storeId,
    {
      name: data.name,
      category: data.category,
    },
    {
      headers: { authorization: `Bearer ${token}` },
    }
  );

  if (data.target === 'managed-sqs') {
    const sqsRelayClient = new SqsRelayApi(undefined, storeApiBaseUrl);

    await sqsRelayClient.createSqsRelay(
      storeId,
      {
        subscription_id: id,
      },
      {
        headers: { authorization: `Bearer ${token}` },
      }
    );
  }

  // TODO: with the relevant consistency guarantee.
  return redirect(`/stores/${storeId}/subscriptions/${id}`);
};

export const loader: LoaderFunction = async ({ params }) => {
  return {};
};

export default function NewSubscription() {
  return (
    <div className="p-5">
      <SectionHeader title="New subscription" />

      <ValidatedForm
        validator={createSubscriptionValidator}
        method="post"
        className="flex h-full flex-col"
      >
        <FormInput className="mb-5" name="name" label="Name" required />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card title="Step 1" subtitle="Source">
            <FormInput
              name="category"
              label="Category"
              required
              placeholder="Foo"
            />

            <div className="mt-4 text-gray-500 text-sm">
              <QuestionMarkCircleIcon className="h-5 w-5 inline-block" />
              <span className="ml-2">
                Subscriptions listen to every event written to streams in a
                corresponding category. Use{' '}
                <code className="p-1 bg-yellow-200">*</code> as category to
                listen to every single one of them.
              </span>
            </div>
          </Card>
          <Card title="Step 2" subtitle="Initial position">
            <RadioFieldset
              name="initial_position"
              options={[
                {
                  value: 'beginning',
                  label: (
                    <>
                      <BackwardIcon className="text-gray-600 w-4 h-4 inline-block" />{' '}
                      Beginning
                    </>
                  ),
                  description:
                    'Start the subscription from the beginning, including previous events.',
                },
                {
                  value: 'now',
                  disabled: true,
                  label: (
                    <span className="text-gray-400">
                      <CameraIcon className="w-4 h-4 inline-block" /> Now
                    </span>
                  ),
                  description:
                    'Only consume new events sent after the subscription is created.',
                },
                {
                  value: 'position',
                  disabled: true,
                  label: (
                    <span className="text-gray-400">
                      <FingerPrintIcon className="w-4 h-4 inline-block" />{' '}
                      Specific position
                    </span>
                  ),
                  description:
                    'Start the subscription from a specific position.',
                },
                {
                  value: 'timestamp',
                  disabled: true,
                  label: (
                    <span className="text-gray-400">
                      <CalendarDaysIcon className="w-4 h-4 inline-block" />{' '}
                      Timestamp
                    </span>
                  ),
                  description:
                    'Start the subscription from a specific timestamp.',
                },
              ]}
            />
          </Card>

          <Card title="Step 3" subtitle="Target">
            <RadioFieldset
              name="target"
              options={[
                {
                  value: 'poll',
                  label: (
                    <>
                      <ArrowDownOnSquareIcon className="text-gray-600 w-4 h-4 inline-block" />{' '}
                      Polling
                    </>
                  ),
                  description:
                    'Your consumer poll from the subscription and commit offsets through the API. ',
                },
                {
                  value: 'managed-sqs',
                  label: (
                    <>
                      <ArrowsPointingOutIcon className="text-gray-600 w-4 h-4 inline-block" />{' '}
                      SQS FIFO queue (managed)
                    </>
                  ),
                  description:
                    'Events will be sent to an SQS FIFO queue, that is managed by Fossil. You will be able to concurrently consume events from as many streams as SQS limits.',
                },
              ]}
            />
          </Card>
        </div>

        <div>
          <SubmitButton>Create</SubmitButton>
        </div>
      </ValidatedForm>
    </div>
  );
}
