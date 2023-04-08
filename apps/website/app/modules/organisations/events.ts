export type AnyOrganisationEvent =
  | OrganisationCreated
  | OrganisationDeleted
  | UserJoinedOrganisation
  | UserLeftOrganisation;

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
    role: 'member' | 'admin';
  };
};

export type UserLeftOrganisation = {
  type: 'UserLeftOrganisation';
  data: {
    user_id: string;
  };
};
