import { Category } from './category';

describe('Category', () => {
  it('can be created from a stream', () => {
    expect(Category.fromStream(`Foo-123`).toString()).toEqual('Foo');
  });

  it('can be converted to a string', () => {
    expect(String(new Category('Foo'))).toEqual('Foo');
  });

  it('can construct a stream', () => {
    expect(new Category('Foo').stream('123')).toEqual('Foo-123');
  });
});
