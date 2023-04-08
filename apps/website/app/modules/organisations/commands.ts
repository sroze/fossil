export type AnyOrganisationCommand =
  | CreateOrganisationCommand
  | AddMemberCommand
  | RemoveMemberCommand;

export type CreateOrganisationCommand = {
  type: 'CreateOrganisationCommand';
  data: {
    name: string;
    created_by: string;
  };
};

export type AddMemberCommand = {
  type: 'AddMemberCommand';
  data: {
    user_id: string;
    role: 'admin' | 'member';
  };
};

export type RemoveMemberCommand = {
  type: 'RemoveMember';
  data: {
    user_id: string;
  };
};
