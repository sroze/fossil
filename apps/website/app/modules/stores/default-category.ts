import { PrefixedStreamEventEncoder } from './tenancy/prefix-encoder';
import { UniqueCategory } from './single-category-store';

export const defaultCategoryEncoder = new PrefixedStreamEventEncoder(
  `${UniqueCategory}-`
);
