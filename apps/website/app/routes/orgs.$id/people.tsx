import { Table } from '~/modules/design-system/table';
import { LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ButtonAndPopup } from '~/modules/design-system/button-and-popup';
import { InviteUserForm } from '~/modules/organisations/frontend/organisms/invite-user-form';
import { SectionHeader } from '~/modules/design-system/section-header';
import { loaderWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { organisation } from '~/modules/organisations/service';
import { profileFromUserIdentifier } from '~/modules/identity-and-authorization/identity-resolver.server';
import { DangerButton, PrimaryButton } from '~/modules/design-system/buttons';

type Person = {
  id: string;
  displayName: string;
  role: string;
};

type LoaderData = {
  org_id: string;
  people: Person[];
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization<LoaderData>(args, async ({ params }) => {
    const { state } = await organisation(params.id!).read();
    if (!state) {
      throw new Error(`Organisation not found.`);
    }

    const people = await Promise.all(
      state.members.map(async (member) => {
        const profile = await profileFromUserIdentifier(member.user_id);

        return {
          id: member.user_id,
          displayName: profile.displayName,
          role: member.role,
        };
      })
    );

    return {
      org_id: params.id!,
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
          <>
            <ButtonAndPopup title="Invite" variant="primary">
              {({ close }) => (
                <InviteUserForm org_id={org_id} onClose={close} />
              )}
            </ButtonAndPopup>
          </>
        }
      />

      <Table>
        <Table.Header>
          <tr>
            <Table.Header.Column>Username</Table.Header.Column>
            <Table.Header.Column>Role</Table.Header.Column>
            <Table.Header.Column></Table.Header.Column>
          </tr>
        </Table.Header>
        <Table.Body>
          {people.map((person) => (
            <tr key={person.id}>
              <Table.Column>{person.displayName}</Table.Column>
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
