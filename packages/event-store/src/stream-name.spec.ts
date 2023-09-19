import { StreamName } from './stream-name';

describe('Stream name', () => {
  it('composes', () => {
    expect(StreamName.compose('Foo', '123')).toEqual('Foo-123');
  });

  it('decomposes', () => {
    expect(StreamName.decompose('Foo-123')).toEqual({
      category: 'Foo',
      identifier: '123',
    });

    expect(StreamName.decompose('Foo-123-456')).toEqual({
      category: 'Foo',
      identifier: '123-456',
    });

    expect(() => StreamName.decompose('FooBar')).toThrowError();
  });
});
