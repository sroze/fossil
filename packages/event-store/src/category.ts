export class Category {
  constructor(private readonly category: string) {}

  static fromStream(stream: string): Category {
    const firstDashPosition = stream.indexOf('-');
    if (firstDashPosition === -1) {
      throw new Error(`Stream "${stream}" does have a category.`);
    }

    return new Category(stream.substring(0, firstDashPosition));
  }

  stream(identifier: string): string {
    return `${this.category}-${identifier}`;
  }

  toString(): string {
    return this.category;
  }
}
