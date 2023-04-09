import { Table } from '../../modules/design-system/table';
import { ButtonAndPopup } from '../../modules/design-system/button-and-popup';
import { GenerateKeyForm } from '../../modules/security/organisms/generate-key';
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { StoreService } from '../../modules/stores/service';
import { LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { SectionHeader } from '~/modules/design-system/section-header';

type LoaderData = {
  store_id: string;
  jwks: Array<{ id: string; name: string; type: string }>;
};

export const loader: LoaderFunction = async ({ params }) => {
  const store_id = params.id!;
  const store = await StoreService.resolve().load(store_id);

  return json<LoaderData>({
    store_id,
    jwks: store.jwks.map((k) => ({
      id: k.key_id,
      name: k.name,
      type: k.type,
    })),
  });
};

export default function Security() {
  const { store_id, jwks } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <SectionHeader
        title="Encryption keys"
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
                {key.type === 'hosted' ? (
                  <span>
                    <ShieldCheckIcon className="text-green-600 w-4 h-4 inline-block" />{' '}
                    Hosted
                  </span>
                ) : (
                  <span>
                    <LockClosedIcon className="text-gray-600 w-4 h-4 inline-block" />{' '}
                    Private
                  </span>
                )}
              </Table.Column>
              <Table.Column>
                <form
                  method="post"
                  action={`/stores/${store_id}/security/keys/${key.id}/delete`}
                >
                  <button
                    type="submit"
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Delete
                  </button>
                </form>
              </Table.Column>
            </tr>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
