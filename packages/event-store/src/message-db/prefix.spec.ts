import { prefixFromCategory } from './prefix';

describe('prefixFromCategory', () => {
  it('only supports "#*" wildcards', () => {
    expect(() => prefixFromCategory('*')).toThrowError();
  });
});
