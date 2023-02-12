import { PrefixedStreamEventEncoder } from './prefix-encoder';

export const DefaultCategory = 'Default';
export const defaultCategoryEncoder = new PrefixedStreamEventEncoder(
  `${DefaultCategory}-`
);
