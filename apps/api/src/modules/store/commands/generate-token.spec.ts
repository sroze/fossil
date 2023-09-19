import { claimListToClaims } from './generake-token';

describe('claim list to claims', () => {
  it('converts a list of claims to a claims object', () => {
    expect(
      claimListToClaims('123', [
        'read.streams=*',
        'write.streams=Foo-*,Bar-123',
        'management=*',
      ]),
    ).toEqual({
      store_id: '123',
      read: { streams: ['*'] },
      write: { streams: ['Foo-*', 'Bar-123'] },
      management: ['*'],
    });
  });
});
