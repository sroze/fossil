import { Decider } from 'eskit-ish';
import { AnyOrganisationEvent } from '~/modules/organisations/events';
import { AnyOrganisationCommand } from '~/modules/organisations/commands';

export type State = {
  name: string;
  members: Array<{ user_id: string; role: string }>;
};

export const decider: Decider<
  State | undefined,
  AnyOrganisationEvent,
  AnyOrganisationCommand
> = {
  initialState: undefined,
  evolve: (state, { type, data }) => {
    if (type === 'OrganisationCreated') {
      return {
        name: data.name,
        members: [{ user_id: data.created_by, role: 'admin' }],
      };
    } else if (type === 'OrganisationDeleted') {
      return undefined;
    }

    if (state === undefined) {
      throw new Error('Organisation cannot change as it does not exist.');
    }

    if (type === 'UserJoinedOrganisation') {
      state.members.push({
        user_id: data.user_id,
        role: data.role,
      });
    } else if (type === 'UserLeftOrganisation') {
      state.members = state.members.filter(
        (member) => member.user_id !== data.user_id
      );
    }

    return state;
  },
  decide: ({ type, data }, state) => {
    if (type === 'CreateOrganisationCommand') {
      return [
        {
          type: 'OrganisationCreated',
          data: {
            name: data.name,
            created_by: data.created_by,
          },
        },
      ];
    } else if (state === undefined) {
      throw new Error('Organisation cannot change as it does not exist.');
    }

    if (type === 'AddMemberCommand') {
      if (!state.members.some((member) => member.user_id === data.user_id)) {
        return [
          {
            type: 'UserJoinedOrganisation',
            data: {
              user_id: data.user_id,
              role: data.role,
            },
          },
        ];
      }
    } else if (type === 'RemoveMember') {
      if (state.members.some((member) => member.user_id === data.user_id)) {
        return [
          {
            type: 'UserLeftOrganisation',
            data: {
              user_id: data.user_id,
            },
          },
        ];
      }
    }

    return [];
  },
  isTerminal: (state) => {
    return state === undefined;
  },
};
