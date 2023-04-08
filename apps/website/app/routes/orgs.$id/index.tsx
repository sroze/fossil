import { LoaderFunction } from '@remix-run/node';
import { Table } from '~/modules/design-system/table';
import { pool } from '~/config.backend';
import sql from 'sql-template-tag';
import { useLoaderData } from '@remix-run/react';
import { SectionHeader } from '~/modules/design-system/section-header';
import { loaderWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { ButtonAndPopup } from '~/modules/design-system/button-and-popup';
import { NewStoreForm } from '~/modules/stores/frontend/organisms/new-store-form';

type StoreSummary = { id: string; name: string };

type LoaderData = {
  org_id: string;
  stores: StoreSummary[];
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization<LoaderData>(args, async ({ params }) => {
    const org_id = params.id!;

    const { rows: stores } = await pool.query<StoreSummary>(
      sql`SELECT store_id as id, name FROM stores WHERE org_id = ${org_id}`
    );

    return {
      org_id,
      stores,
    };
  });

export default function Index() {
  const { stores, org_id } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <SectionHeader
        title="Stores"
        right={
          <ButtonAndPopup title="New store" variant="primary">
            <NewStoreForm org_id={org_id} />
          </ButtonAndPopup>
        }
      />

      <Table>
        <Table.Header>
          <tr>
            <Table.Header.Column>Name</Table.Header.Column>
            <Table.Header.Column></Table.Header.Column>
          </tr>
        </Table.Header>
        <Table.Body>
          {stores.map((store) => (
            <tr key={store.name}>
              <Table.Column>{store.name}</Table.Column>
              <Table.Column>
                <a
                  href={`/stores/${store.id}`}
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
