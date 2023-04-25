import { validate } from 'uuid';

export const subscriptionIdentifierFromQueueUrl = (
  queueUrl: string,
): string => {
  if (queueUrl.startsWith('subscription#')) {
    const uuid = queueUrl.substring(13);

    if (!validate(uuid)) {
      throw new Error(`Subscription identifier is not valid`);
    }

    return uuid;
  }

  throw new Error(
    `Provided QueueURL is invalid. It must contain the subscription identifier.`,
  );
};
