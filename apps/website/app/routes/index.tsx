import { loaderWithAuthorization } from '../modules/identity-and-authorization/remix-utils.server';
import { LoaderFunction } from '@remix-run/node';
import { Navbar } from '../modules/layout/organisms/Navbar';
import { H2 } from '~/modules/design-system/h2';
import { Table } from '~/modules/design-system/table';
import { pool } from '~/config.backend';
import sql from 'sql-template-tag';
import { useLoaderData } from '@remix-run/react';
import { classNames } from '~/modules/remix-utils/front-end';
import {
  buttonClassNames,
  colorSchemeClassNames,
  sizeClassNames,
} from '~/modules/design-system/buttons';

type StoreSummary = { id: string; name: string };
type LoaderData = {
  stores: StoreSummary[];
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization<LoaderData>(args, async () => {
    const { rows: stores } = await pool.query<StoreSummary>(
      sql`SELECT store_id as id, name FROM stores`
    );

    return {
      stores,
    };
  });

export default function Index() {
  const { stores } = useLoaderData<LoaderData>();

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar />

      <div className="p-5">
        <a
          href="/stores"
          className={classNames(
            buttonClassNames(),
            sizeClassNames('medium'),
            colorSchemeClassNames('primary'),
            'float-right'
          )}
        >
          New
        </a>

        <H2>Stores</H2>

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
    </div>
  );
}
