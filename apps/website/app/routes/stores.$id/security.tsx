import { Table } from '../../modules/design-system/table';
import { ButtonAndPopup } from '../../modules/design-system/button-and-popup';
import { GenerateKeyForm } from '../../modules/security/organisms/generate-key';
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getAuthenticatedStoreApi } from '../../modules/stores/service';
import { LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { SectionHeader } from '~/modules/design-system/section-header';
import { DangerButton } from '~/modules/design-system/buttons';
import { GenerateToken } from '~/modules/security/organisms/generate-token';
import { KeyItemResponse } from 'fossil-api-client';

type LoaderData = {
  store_id: string;
  jwks: KeyItemResponse[];
};

export const loader: LoaderFunction = async ({ params }) => {
  const store_id = params.id!;
  const api = await getAuthenticatedStoreApi(store_id);
  const { data } = await api.listKeys(store_id);

  return json<LoaderData>({
    store_id,
    jwks: data,
  });
};

export default function Security() {
  const { store_id, jwks } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <SectionHeader
        title="Signature keys"
        subtitle="Keys are used to sign tokens to be able to read & write from the store."
        right={
          <ButtonAndPopup title="Generate a new key" variant="primary">
            <GenerateKeyForm store_id={store_id} />
          </ButtonAndPopup>
        }
      />

      <Table>
        <Table.Header>
          <tr>
            <Table.Header.Column>Name</Table.Header.Column>
            <Table.Header.Column>Type</Table.Header.Column>
            <Table.Header.Column></Table.Header.Column>
          </tr>
        </Table.Header>
        <Table.Body>
          {jwks.map((key, i) => (
            <tr key={`jwt-${i}`}>
              <Table.Column>{key.name}</Table.Column>
              <Table.Column>
                {key.type === 'managed' ? (
                  <span>
                    <ShieldCheckIcon className="text-green-600 w-4 h-4 inline-block" />{' '}
                    Managed
                  </span>
                ) : (
                  <span>
                    <LockClosedIcon className="text-gray-600 w-4 h-4 inline-block" />{' '}
                    Downloaded
                  </span>
                )}
              </Table.Column>
              <Table.Column>
                {key.type === 'managed' ? (
                  <ButtonAndPopup title="Generate token" size="small">
                    <GenerateToken store_id={store_id} key_id={key.id} />
                  </ButtonAndPopup>
                ) : null}
                <form
                  method="post"
                  className="inline-block"
                  action={`/stores/${store_id}/security/keys/${key.id}/delete`}
                >
                  <DangerButton type="submit" size="small">
                    Delete
                  </DangerButton>
                </form>
              </Table.Column>
            </tr>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
