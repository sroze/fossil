import { IEventStore } from 'event-store';
import { PrefixedStore } from './prefixed-store';

export function cleanUuid(uuid: string): string {
  return uuid.replace(/-/g, '');
}

export function dashifyUuid(uuid: string): string {
  if (uuid.length !== 32) {
    throw new Error(`Expects 32 characters from a clean UUID.`);
  }

  return [
    uuid.slice(0, 8),
    uuid.slice(8, 12),
    uuid.slice(12, 16),
    uuid.slice(16, 20),
    uuid.slice(20, 32),
  ].join('-');
}

export function storeIdentifierToStreamPrefix(storeId: string): string {
  return `Store@${cleanUuid(storeId)}#`;
}

export function storeIdentifierFromStreamName(
  stream: string
): string | undefined {
  if (!stream.startsWith(`Store@`)) {
    return undefined;
  }

  const hashTagPosition = stream.indexOf('#');
  if (hashTagPosition === -1) {
    return undefined;
  }

  return dashifyUuid(stream.substring(6, hashTagPosition));
}

export class StoreLocator {
  constructor(private readonly systemStore: IEventStore) {}

  async locate(storeId: string): Promise<IEventStore> {
    if (!storeId) {
      throw new Error(`Identifier provided is invalid.`);
    }

    return new PrefixedStore(
      this.systemStore,
      storeIdentifierToStreamPrefix(storeId)
    );
  }
}
