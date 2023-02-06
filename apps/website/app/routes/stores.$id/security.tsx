import { H2 } from '../../modules/design-system/h2';
import { Table } from '../../modules/design-system/table';
import { ButtonAndPopup } from '../../modules/design-system/button-and-popup';
import { GenerateKeyForm } from '../../modules/security/organisms/generate-key';
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { StoreService } from '../../modules/stores/service';
import { StoreState } from '../../modules/stores/domain/store';
import { LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';

type LoaderData = {
  store: StoreState;
};

export const loader: LoaderFunction = async ({ params }) => {
  const { state: store } = await StoreService.resolve().load(params.id!);

  return json<LoaderData>({
    store,
  });
};

export default function Security() {
  const { store } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <div className="float-right">
        <ButtonAndPopup title="Generate a new key" variant="primary">
          <GenerateKeyForm store_id={store.id} />
        </ButtonAndPopup>
      </div>

      <H2>Encryption keys</H2>
      <div>
        Keys are used to sign tokens to be able to read & write from the store.
      </div>

      <Table>
        <Table.Header>
          <tr>
            <Table.Header.Column>Name</Table.Header.Column>
            <Table.Header.Column>Added at</Table.Header.Column>
            <Table.Header.Column>Type</Table.Header.Column>
            <Table.Header.Column></Table.Header.Column>
          </tr>
        </Table.Header>
        <Table.Body>
          {store.jwks.map((key, i) => (
            <tr key={`jwt-${i}`}>
              <Table.Column>{key.name}</Table.Column>
              <Table.Column>{key.added_at}</Table.Column>
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
                  action={`/stores/${store.id}/security/keys/${key.id}/delete`}
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
