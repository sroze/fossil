import { IEventStore } from 'event-store';
import { TenantedStore } from './tenancy/tenanted-store';

export class StoreLocator {
  constructor(private readonly systemStore: IEventStore) {}

  async locate(storeId: string): Promise<IEventStore> {
    if (!storeId) {
      throw new Error(`Identifier provided is invalid.`);
    }

    return new TenantedStore(this.systemStore, storeId.replace(/-/g, ''));
  }
}
