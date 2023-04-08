// Commands
import { createAggregate, Decider } from '~/utils/ddd';
import { fossilEventStore } from '~/config.backend';

export type AnyInviteCommand =
  | CreateInviteCommand
  | AcceptInviteCommand
  | MarkUserAddedToOrganisationCommand;
export type CreateInviteCommand = {
  type: 'CreateInviteCommand';
  data: {
    org_id: string;
    invited_email: string;
    invited_role: 'admin' | 'member';
    invited_by: string;
  };
};

export type AcceptInviteCommand = {
  type: 'AcceptInviteCommand';
  data: {
    user_id: string;
    user_email: string;
  };
};

export type MarkUserAddedToOrganisationCommand = {
  type: 'MarkUserAddedToOrganisation';
  data: { org_version: string };
};

// Events
export type AnyInviteEvent =
  | InviteCreatedEvent
  | InviteAcceptedEvent
  | UserJoinedOrganisationEvent;
export type InviteCreatedEvent = {
  type: 'InviteCreatedEvent';
  data: CreateInviteCommand['data'];
};

export type InviteAcceptedEvent = {
  type: 'InviteAcceptedEvent';
  data: { user_id: string };
};

export type UserJoinedOrganisationEvent = {
  type: 'UserAddedToOrganisation';
  data: { org_version: string };
};

// Decider
export type State = {
  org_id: string;
  role: 'admin' | 'member';
  invited_email: string;
  invited_by: string;
  status: 'pending' | 'accepted';
};

export const decider: Decider<
  State | undefined,
  AnyInviteEvent,
  AnyInviteCommand
> = {
  initialState: undefined,
  evolve: (state, { type, data }) => {
    if (type === 'InviteCreatedEvent') {
      return {
        org_id: data.org_id,
        role: data.invited_role,
        invited_email: data.invited_email,
        invited_by: data.invited_by,
        status: 'pending',
      };
    } else if (state === undefined) {
      throw new Error('Invite cannot change as it does not exist.');
    } else if (type === 'InviteAcceptedEvent') {
      return {
        ...state,
        status: 'accepted',
      };
    }

    return state;
  },
  decide: ({ type, data }, state) => {
    if (type === 'CreateInviteCommand') {
      return [
        {
          type: 'InviteCreatedEvent',
          data,
        },
      ];
    } else if (state === undefined) {
      throw new Error('Invite cannot be touched as it does not exist.');
    }

    if (type === 'AcceptInviteCommand') {
      if (state.status === 'accepted') {
        throw new Error('Invite has already been accepted.');
      } else if (state.invited_email !== data.user_email) {
        throw new Error('Invite was not sent to this email address.');
      }

      return [{ type: 'InviteAcceptedEvent', data: { user_id: data.user_id } }];
    } else if (type === 'MarkUserAddedToOrganisation') {
      return [
        {
          type: 'UserAddedToOrganisation',
          data: {
            org_version: data.org_version,
          },
        },
      ];
    }

    return [];
  },
};

export const invitation = (id: string) => {
  const aggregate = createAggregate(fossilEventStore, decider);

  return {
    read: () => aggregate.read(`Invitation-${id}`),
    write: (command: AnyInviteCommand) =>
      aggregate.write({}, `Invitation-${id}`, command),
  };
};
