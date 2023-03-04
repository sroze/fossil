import { authorizeReadStream, authorizeWrite } from './authorizer';
import { ReadClaims } from './interfaces';

describe('Authorizer', () => {
  describe('writes', () => {
    it('Allows only the streams in the list', () => {
      const claim = {
        streams: ['foo-1', 'bar-1'],
      };

      expect(authorizeWrite(claim, 'foo-1')).toBe(true);
      expect(authorizeWrite(claim, 'foo-2')).toBe(false);
      expect(authorizeWrite(claim, 'bar-1')).toBe(true);
      expect(authorizeWrite(claim, 'foo-2')).toBe(false);
    });

    it('Allows any stream with the `*` claim', () => {
      const claim = {
        streams: ['*'],
      };

      expect(authorizeWrite(claim, 'foo-1')).toBe(true);
      expect(authorizeWrite(claim, 'bar-2')).toBe(true);
    });

    it('Allows writing if the category is allowed', () => {
      const claim = {
        streams: ['Foo-*', 'Baz-*'],
      };

      expect(authorizeWrite(claim, 'Foo-1')).toBe(true);
      expect(authorizeWrite(claim, 'Bar-2')).toBe(false);
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
