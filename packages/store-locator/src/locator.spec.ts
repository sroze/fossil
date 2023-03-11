import {
  cleanUuid,
  dashifyUuid,
  storeIdentifierToStreamPrefix,
  storeIdentifierFromStreamName,
} from './locator';

describe('UUID cleaner', () => {
  it('cleans and uncleans', () => {
    const id = '61045b9d-7bee-4f8b-a8ea-22a934842c13';
    const cleaned = '61045b9d7bee4f8ba8ea22a934842c13';

    expect(cleanUuid(id)).toEqual(cleaned);
    expect(dashifyUuid(cleaned)).toEqual(id);
  });
});

describe('Identifier', () => {
  it('works with UUIDs', () => {
    expect(
      storeIdentifierToStreamPrefix('c4fa4ab6-c02b-11ed-baab-07896cc92c52')
    ).toEqual(`Store@c4fa4ab6c02b11edbaab07896cc92c52#`);
  });

  it('can be reversed', () => {
    const identifier = 'cf5ae164-c02b-11ed-94dd-8b6f4447c72e';

    const reversed = storeIdentifierFromStreamName(
      `${storeIdentifierToStreamPrefix(identifier)}Foo-1234`
    );

    expect(reversed).toEqual(identifier);
  });
});
