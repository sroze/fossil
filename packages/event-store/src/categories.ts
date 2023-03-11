export const categoryFromStream = (stream: string): string => {
  const firstDashPosition = stream.indexOf('-');
  if (firstDashPosition === -1) {
    throw new Error(`Stream "${stream}" does have a category.`);
  }

  return stream.substring(0, firstDashPosition);
};
