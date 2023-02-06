import type { IEventStore } from 'event-store';
import { fossilEventStore } from '../event-store/store.backend';
import { TenantedStore } from './tenancy/tenanted-store';
import { SingleCategoryStore } from './single-category-store';

export function storeForIdentifier(id: string): IEventStore {
  if (!id) {
    throw new Error(`Identifier provided is invalid.`);
  }

  return new SingleCategoryStore(
    new TenantedStore(fossilEventStore, id.replace(/-/g, '')),
    'Default'
  );
}
