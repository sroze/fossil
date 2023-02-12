import { IEventStore } from 'event-store';
import { SingleCategoryStore } from './tenancy/single-category-store';
import { TenantedStore } from './tenancy/tenanted-store';
import { DefaultCategory } from './tenancy/default-category';

export class StoreLocator {
  constructor(private readonly systemStore: IEventStore) {}

  async locate(storeId: string): Promise<IEventStore> {
    if (!storeId) {
      throw new Error(`Identifier provided is invalid.`);
    }

    return new SingleCategoryStore(
      new TenantedStore(this.systemStore, storeId.replace(/-/g, '')),
      DefaultCategory
    );
  }
}
