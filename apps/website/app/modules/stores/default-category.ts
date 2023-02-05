import { TenantedEventEncoder } from './tenanted-store';

export const DefaultCategory = 'Default';
export const defaultCategoryEncoder = new TenantedEventEncoder(
  `${DefaultCategory}-`
);
