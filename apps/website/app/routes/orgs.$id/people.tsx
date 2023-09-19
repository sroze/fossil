import { Table } from '~/modules/design-system/table';
import { LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ButtonAndPopup } from '~/modules/design-system/button-and-popup';
import { InviteUserForm } from '~/modules/organisations/frontend/organisms/invite-user-form';
import { SectionHeader } from '~/modules/design-system/section-header';
import { loaderWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { DangerButton } from '~/modules/design-system/buttons';
import { pool } from '~/config.backend';
import sql from 'sql-template-tag';

type Person = {
  id: string;
  email: string;
  role: string;
};

type LoaderData = {
  org_id: string;
  people: Person[];
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization<LoaderData>(args, async ({ params }) => {
    const org_id = params.id!;
    const { rows: people } = await pool.query<Person>(
      sql`SELECT p.user_id as id, p.email, uio.role
          FROM users_in_orgs uio
          INNER JOIN profiles p ON p.user_id = uio.user_id
          WHERE uio.org_id = ${org_id}`
    );

    return {
      org_id,
      people,
    };
  });

export default function People() {
  const { people, org_id } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <SectionHeader
        title="People"
        right={
          <ButtonAndPopup title="Invite" variant="primary">
            {({ close }) => <InviteUserForm org_id={org_id} onClose={close} />}
          </ButtonAndPopup>
        }
      />

      <Table>
        <Table.Header>
          <tr>
            <Table.Header.Column>Email</Table.Header.Column>
            <Table.Header.Column>Role</Table.Header.Column>
            <Table.Header.Column></Table.Header.Column>
          </tr>
        </Table.Header>
        <Table.Body>
          {people.map((person) => (
            <tr key={person.id}>
              <Table.Column>{person.email}</Table.Column>
              <Table.Column>{person.role}</Table.Column>
              <Table.Column>
                <form
                  action={`/orgs/${org_id}/people/${person.id}/remove`}
                  method="post"
                >
                  <DangerButton type="submit" size="small">
                    Remove
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
