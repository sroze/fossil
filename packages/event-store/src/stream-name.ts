export class StreamName {
  static compose(category: string, identifier: string): string {
    return `${category}-${identifier}`;
  }

  static decompose(stream: string): { category: string; identifier: string } {
    const separatorPosition = stream.indexOf('-');
    if (separatorPosition === -1) {
      throw new Error('Provided stream name is not valid.');
    }

    return {
      category: stream.substring(0, separatorPosition),
      identifier: stream.substring(separatorPosition + 1),
    };
  }
}
