export type AnyOrganisationEvent =
  | OrganisationCreated
  | OrganisationDeleted
  | UserJoinedOrganisation
  | UserLeftOrganisation
  | StoreCreated
  | StoreArchived;

export type Role = 'member' | 'admin';
export type OrganisationCreated = {
  type: 'OrganisationCreated';
  data: {
    name: string;
    created_by: string;
  };
};

export type OrganisationDeleted = {
  type: 'OrganisationDeleted';
  data: {};
};

export type UserJoinedOrganisation = {
  type: 'UserJoinedOrganisation';
  data: {
    user_id: string;
    role: Role;
  };
};

export type UserLeftOrganisation = {
  type: 'UserLeftOrganisation';
  data: {
    user_id: string;
  };
};

export type StoreCreated = {
  type: 'StoreCreated';
  data: {
    store_id: string;
    management_token: string;
    name: string;
  };
};

export type StoreArchived = {
  type: 'StoreArchived';
  data: {
    store_id: string;
  };
};
