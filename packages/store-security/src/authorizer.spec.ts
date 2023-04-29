import {
  authorize,
  authorizeReadStream,
  authorizeWriteStream,
} from './authorizer';
import { ReadClaims } from './interfaces';

describe('Authorizer', () => {
  describe('writes', () => {
    it('Allows only the streams in the list', () => {
      const claim = {
        streams: ['foo-1', 'bar-1'],
      };

      expect(authorizeWriteStream(claim, 'foo-1')).toBe(true);
      expect(authorizeWriteStream(claim, 'foo-2')).toBe(false);
      expect(authorizeWriteStream(claim, 'bar-1')).toBe(true);
      expect(authorizeWriteStream(claim, 'foo-2')).toBe(false);
    });

    it('Allows any stream with the `*` claim', () => {
      const claim = {
        streams: ['*'],
      };

      expect(authorizeWriteStream(claim, 'foo-1')).toBe(true);
      expect(authorizeWriteStream(claim, 'bar-2')).toBe(true);
    });

    it('Allows writing if the category is allowed', () => {
      const claim = {
        streams: ['Foo-*', 'Baz-*'],
      };

      expect(authorizeWriteStream(claim, 'Foo-1')).toBe(true);
      expect(authorizeWriteStream(claim, 'Bar-2')).toBe(false);
    });
  });

  describe('reads', () => {
    it('Allows only the streams in the list', () => {
      const claim: ReadClaims = {
        streams: ['foo-1', 'bar-1'],
      };

      expect(authorizeReadStream(claim, 'foo-1')).toBe(true);
      expect(authorizeReadStream(claim, 'foo-2')).toBe(false);
      expect(authorizeReadStream(claim, 'bar-1')).toBe(true);
      expect(authorizeReadStream(claim, 'bar-2')).toBe(false);
    });

    it('allows reading a stream is the category is allowed', () => {
      const claim: ReadClaims = {
        streams: ['foo-*', 'bar-1'],
      };

      expect(authorizeReadStream(claim, 'foo-1')).toBe(true);
      expect(authorizeReadStream(claim, 'foo-2')).toBe(true);
      expect(authorizeReadStream(claim, 'bar-1')).toBe(true);
      expect(authorizeReadStream(claim, 'bar-2')).toBe(false);
    });

    it('Allows any stream with the `*` claim', () => {
      const claim = {
        streams: ['*'],
      };

      expect(authorizeReadStream(claim, 'foo-1')).toBe(true);
      expect(authorizeReadStream(claim, 'bar-2')).toBe(true);
    });
  });
});

describe('authorize', () => {
  it('allows to specify streams and category', () => {
    expect(
      authorize(
        { read: { streams: ['Foo-1'] } },
        { read: { streams: ['Foo-1'] } }
      )
    ).toBe(true);
    expect(
      authorize(
        { read: { streams: ['Foo-2'] } },
        { read: { streams: ['Foo-1'] } }
      )
    ).toBe(false);
    expect(
      authorize(
        { read: { streams: ['Foo-*'] } },
        { read: { streams: ['Foo-1'] } }
      )
    ).toBe(true);
    expect(
      authorize(
        { read: { streams: ['Foo-*'] } },
        { read: { streams: ['Foo-*'] } }
      )
    ).toBe(true);
    expect(
      authorize({ read: { streams: ['*'] } }, { read: { streams: ['Foo-*'] } })
    ).toBe(true);
    expect(
      authorize({ read: { streams: ['*'] } }, { read: { streams: ['*'] } })
    ).toBe(true);
    expect(
      authorize({ read: { streams: ['Foo-*'] } }, { read: { streams: ['*'] } })
    ).toBe(false);
  });

  it('supports reads and subscriptions', () => {
    expect(
      authorize(
        { read: { subscriptions: ['123'] } },
        { read: { subscriptions: ['123'] } }
      )
    ).toBe(true);
    expect(
      authorize(
        { read: { subscriptions: ['123', '456'] } },
        { read: { subscriptions: ['123'] } }
      )
    ).toBe(true);
    expect(
      authorize(
        { read: { subscriptions: ['456'] } },
        { read: { subscriptions: ['123'] } }
      )
    ).toBe(false);
  });

  it('support writing in my specfic streams', () => {
    expect(
      authorize(
        { write: { streams: ['Foo-1'] } },
        { write: { streams: ['Foo-1'] } }
      )
    ).toBe(true);
    expect(
      authorize(
        { write: { streams: ['Foo-2'] } },
        { write: { streams: ['Foo-1'] } }
      )
    ).toBe(false);
    expect(
      authorize(
        { write: { streams: ['Foo-*'] } },
        { write: { streams: ['Foo-1'] } }
      )
    ).toBe(true);
    expect(
      authorize(
        { write: { streams: ['Foo-*'] } },
        { write: { streams: ['Foo-*'] } }
      )
    ).toBe(true);
    expect(
      authorize(
        { write: { streams: ['*'] } },
        { write: { streams: ['Foo-*'] } }
      )
    ).toBe(true);
    expect(
      authorize({ write: { streams: ['*'] } }, { write: { streams: ['*'] } })
    ).toBe(true);
    expect(
      authorize(
        { write: { streams: ['Foo-*'] } },
        { write: { streams: ['*'] } }
      )
    ).toBe(false);
  });

  it('supports management', () => {
    expect(
      authorize(
        { management: ['keys', 'subscriptions'] },
        { management: ['keys', 'subscriptions'] }
      )
    ).toBe(true);
    expect(
      authorize(
        { management: ['keys', 'subscriptions'] },
        { management: ['keys'] }
      )
    ).toBe(true);
    expect(
      authorize({ management: ['keys'] }, { management: ['subscriptions'] })
    ).toBe(false);
  });

  it('authorize everything with a wildcard management claim', () => {
    expect(
      authorize({ management: ['*'] }, { management: ['subscriptions'] })
    ).toBe(true);

    expect(authorize({ management: ['*'] }, { read: { streams: ['*'] } })).toBe(
      true
    );
  });
});
