import { StoreLocator } from 'store-locator';
import { fossilEventStore } from '~/config.backend';

export const locator = new StoreLocator(fossilEventStore);
