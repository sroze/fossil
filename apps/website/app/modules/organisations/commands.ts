import { Role } from './events';

export type AnyOrganisationCommand =
  | CreateOrganisationCommand
  | AddMemberCommand
  | RemoveMemberCommand
  | CreateStoreCommand
  | ArchiveStoreCommand;

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
    role: Role;
  };
};

export type RemoveMemberCommand = {
  type: 'RemoveMember';
  data: {
    user_id: string;
  };
};

export type CreateStoreCommand = {
  type: 'CreateStore';
  data: {
    id: string;
    name: string;
  };
};

export type ArchiveStoreCommand = {
  type: 'ArchiveStore';
  data: {
    store_id: string;
  };
};
