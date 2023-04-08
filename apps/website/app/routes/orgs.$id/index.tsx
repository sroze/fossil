import { LoaderFunction } from '@remix-run/node';
import { H2 } from '~/modules/design-system/h2';
import { Table } from '~/modules/design-system/table';
import { pool } from '~/config.backend';
import sql from 'sql-template-tag';
import { useLoaderData } from '@remix-run/react';
import { classNames } from '~/modules/remix-utils/front-end';
import {
  buttonClassNames,
  colorSchemeClassNames,
  PrimaryLink,
  sizeClassNames,
} from '~/modules/design-system/buttons';
import { SectionHeader } from '~/modules/design-system/section-header';

type StoreSummary = { id: string; name: string };
type LoaderData = {
  stores: StoreSummary[];
};

export const loader: LoaderFunction = async ({ params }) => {
  // TODO: Filter by org_id.
  const { rows: stores } = await pool.query<StoreSummary>(
    sql`SELECT store_id as id, name FROM stores`
  );

  return {
    stores,
  };
};

export default function Index() {
  const { stores } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <SectionHeader
        title="Stores"
        right={
          <PrimaryLink href="/orgs/new" className="float-right">
            New
          </PrimaryLink>
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
