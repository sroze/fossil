import {
  deserializeCheckpoint,
  serializeCheckpoint,
} from '~/utils/eventual-consistency';

describe('checkpoint', () => {
  it('serializes and deserializes global checkpoint', () => {
    expect(
      deserializeCheckpoint(serializeCheckpoint({ global_position: 10n }))
    ).toEqual({
      global_position: 10n,
    });
  });

  it('serializes and deserializes stream checkpoint', () => {
    expect(
      deserializeCheckpoint(
        serializeCheckpoint({ stream_name: 'foo', position: 10n })
      )
    ).toEqual({
      stream_name: 'foo',
      position: 10n,
    });
  });
});
