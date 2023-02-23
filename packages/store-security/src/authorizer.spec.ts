import {authorizeRead, authorizeWrite} from "./authorizer";
import {ReadClaims} from "./interfaces";

describe('Authorizer', () => {
  describe('writes', () => {
    it('Allows only the streams in the list', () => {
      const claim = {
        streams: ['foo-1', 'bar-1']
      };

      expect(authorizeWrite(claim, 'foo-1')).toBe(true);
      expect(authorizeWrite(claim, 'foo-2')).toBe(false);
      expect(authorizeWrite(claim, 'bar-1')).toBe(true);
      expect(authorizeWrite(claim, 'foo-2')).toBe(false);
    });

    it('Allows any stream with the `*` claim', () => {
      const claim = {
        streams: ['*']
      };

      expect(authorizeWrite(claim, 'foo-1')).toBe(true);
      expect(authorizeWrite(claim, 'bar-2')).toBe(true);
    });
  });

  describe('reads', () => {
    it('Allows only the streams in the list', () => {
      const claim: ReadClaims = {
        streams: ['foo-1', 'bar-1']
      };

      expect(authorizeRead(claim, 'foo-1')).toBe(true);
      expect(authorizeRead(claim, 'foo-2')).toBe(false);
      expect(authorizeRead(claim, 'bar-1')).toBe(true);
      expect(authorizeRead(claim, 'foo-2')).toBe(false);
    });

    it('Allows any stream with the `*` claim', () => {
      const claim = {
        streams: ['*']
      };

      expect(authorizeRead(claim, 'foo-1')).toBe(true);
      expect(authorizeRead(claim, 'bar-2')).toBe(true);
    });
  })
});
