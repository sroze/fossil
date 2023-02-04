// TODO: Add a limit!
export async function accumulate<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const buffer: T[] = [];

  for await (const item of stream) {
    buffer.push(item);
  }

  return buffer;
}
