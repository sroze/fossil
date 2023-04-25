import { subscriptionIdentifierFromQueueUrl } from './subscription-as-queue';
import { v4 } from 'uuid';

describe('subscriptionIdentifierFromQueueUrl', () => {
  it('throws an error for invalid things', () => {
    expect(() => subscriptionIdentifierFromQueueUrl('foobar')).toThrowError();
    expect(() =>
      subscriptionIdentifierFromQueueUrl('subscription#123'),
    ).toThrowError();
  });

  it('extracts from the hashtag format', () => {
    const id = v4();

    expect(subscriptionIdentifierFromQueueUrl('subscription#' + id)).toEqual(
      id,
    );
  });
});
