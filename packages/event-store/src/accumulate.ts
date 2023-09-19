export async function accumulate<T>(
  stream: AsyncIterable<T>,
  limit?: number
): Promise<T[]> {
  const buffer: T[] = [];

  for await (const item of stream) {
    buffer.push(item);

    if (limit !== undefined && buffer.length >= limit) {
      break;
    }
  }

  return buffer;
}
