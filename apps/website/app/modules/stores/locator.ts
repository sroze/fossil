import { StoreLocator } from 'store-locator';
import { fossilEventStore } from '~/modules/event-store/store.backend';

export const locator = new StoreLocator(fossilEventStore);
