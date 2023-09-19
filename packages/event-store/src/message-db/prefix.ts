export function prefixFromCategory(category: string): string | undefined {
  if (category.indexOf('*') === -1) {
    return undefined;
  }

  const prefixPosition = category.indexOf('#*');
  if (prefixPosition === -1) {
    throw new Error(`"${category}" is an invalid wildcard category.`);
  }

  const prefix = category.substring(0, prefixPosition);
  if (prefix.indexOf('-') !== -1) {
    throw new Error(`"${prefix}" is an invalid prefix.`);
  }

  return prefix;
}
