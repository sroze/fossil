import { LoaderFunction, redirect } from '@remix-run/node';
import { loaderWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { pool } from '~/config.backend';
import sql from 'sql-template-tag';
import { useLoaderData } from '@remix-run/react';
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import { H2 } from '~/modules/design-system/h2';
import { PrimaryLink } from '~/modules/design-system/buttons';

type UserInOrg = {
  org_id: string;
  name: string;
  role: string;
};

type LoaderData = {
  orgs: UserInOrg[];
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization<LoaderData>(args, async ({ profile }) => {
    const { rows: orgs } = await pool.query<UserInOrg>(
      sql`SELECT o.name, o.org_id, uio.role
          FROM users_in_orgs uio
          INNER JOIN orgs o ON o.org_id = uio.org_id
          WHERE uio.user_id = ${profile.id}`
    );

    if (orgs.length === 0) {
      return redirect('/orgs/new');
    }

    return {
      orgs,
    };
  });

export default function Orgs() {
  const { orgs } = useLoaderData<LoaderData>();
  return (
    <div className="min-h-full bg-gray-100 p-10">
      <div className="m-auto max-w-md">
        <div className="text-center p-4">
          <H2>Your organisations</H2>
        </div>

        <div className="bg-white shadow sm:rounded-md overflow-hidden">
          {orgs.map((org) => (
            <a
              key={org.org_id}
              href={`/orgs/${org.org_id}`}
              className="block hover:bg-gray-50"
            >
              <div className="flex items-center px-4 py-4 sm:px-6">
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                  {org.name}
                </div>
                <div className="mt-4 flex-shrink-0 sm:ml-5 sm:mt-0">
                  {org.role}
                </div>
                <div className="ml-5 flex-shrink-0">
                  <ChevronRightIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="text-center p-4 mt-10">
          <PrimaryLink href="/orgs/new">New organisation</PrimaryLink>
        </div>
      </div>
    </div>
  );
}
