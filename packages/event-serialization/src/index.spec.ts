import { serializeEventInStoreForWire } from './index';

describe('serializeEventInStoreForWire', () => {
  it('transforms BigInts to strings', () => {
    expect(
      serializeEventInStoreForWire({
        id: '0000',
        type: 'Foo',
        data: {},
        stream_name: 'Foo-123',
        position: 1n,
        global_position: 2n,
        time: new Date('2020-01-01T00:00:00.000Z'),
      })
    ).toEqual(
      expect.objectContaining({
        position: '1',
        global_position: '2',
      })
    );
  });
});
