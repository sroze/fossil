import { H2 } from '~/modules/design-system/h2';
import { DangerButton } from '~/modules/design-system/buttons';
import { Checkbox } from '~/modules/design-system/checkbox';
import React from 'react';
import { ButtonAndPopup } from '~/modules/design-system/button-and-popup';
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

type LoaderData = {
  store_id: string;
};

export const loader: LoaderFunction = async ({ params }) => {
  return json<LoaderData>({
    store_id: params.id!,
  });
};

export default function Admin() {
  const { store_id } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <H2>Admin</H2>

      <div className="bg-white pt-6 shadow sm:overflow-hidden sm:rounded-md mt-4">
        <div className="px-4 sm:px-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900">
            Danger zone
          </h2>
        </div>
        <div className="mt-6 flex flex-row items-center border-t border-gray-200">
          <div className="flex-1 p-5">
            <strong>Delete store</strong>
            <br />
            This action is irreversible.
          </div>
          <div className="flex-2 p-5">
            <ButtonAndPopup title="Delete" variant="danger">
              <form action={`/stores/${store_id}/delete`} method="post">
                <Checkbox name="confirm" value="yes">
                  <span className="font-medium text-gray-900">I confirm</span>{' '}
                  <span className="text-gray-500">
                    that I want to delete this subscription.
                  </span>
                </Checkbox>

                <DangerButton type="submit">Delete</DangerButton>
              </form>
            </ButtonAndPopup>
          </div>
        </div>
      </div>
    </div>
  );
}
