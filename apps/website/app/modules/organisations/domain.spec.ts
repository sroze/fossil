import { decider } from './domain';
import { given } from '../../utils/testing';

describe('Organisation', () => {
  it('whoever creates the organisation is defacto an admin', () => {
    const { state } = given(decider, [
      {
        type: 'OrganisationCreated',
        data: { name: 'My Organisation', created_by: '1' },
      },
    ]);

    expect(state!.members).toEqual([
      expect.objectContaining({ user_id: '1', role: 'admin' }),
    ]);
  });

  it('keeps track of existing members', () => {
    const { state } = given(decider, [
      {
        type: 'OrganisationCreated',
        data: { name: 'My Organisation', created_by: '1' },
      },
      {
        type: 'UserJoinedOrganisation',
        data: { user_id: '2', role: 'member' },
      },
      {
        type: 'UserJoinedOrganisation',
        data: { user_id: '3', role: 'member' },
      },
      { type: 'UserLeftOrganisation', data: { user_id: '3' } },
    ]);

    expect(state!.members).toEqual([
      expect.objectContaining({ user_id: '1', role: 'admin' }),
      expect.objectContaining({ user_id: '2', role: 'member' }),
    ]);
  });

  it('can remove the initial creator of the org', () => {
    const { state } = given(decider, [
      {
        type: 'OrganisationCreated',
        data: { name: 'My Organisation', created_by: '1' },
      },
      {
        type: 'UserJoinedOrganisation',
        data: { user_id: '2', role: 'member' },
      },
    ]).when({
      type: 'RemoveMember',
      data: { user_id: '1' },
    });

    expect(state!.members).toEqual([
      expect.objectContaining({ user_id: '2', role: 'member' }),
    ]);
  });
});
