// Dictionary utilities for word validation

export class Dictionary {
  private words: Set<string>;

  constructor(wordList: string[]) {
    this.words = new Set(wordList.map(w => w.toUpperCase()));
  }

  static async loadFromFile(path: string): Promise<Dictionary> {
    const response = await fetch(path);
    const text = await response.text();
    const words = text
      .split('\n')
      .map(line => line.trim().toUpperCase())
      .filter(word => word.length >= 2 && word.length <= 9);
    return new Dictionary(words);
  }

  isValid(word: string): boolean {
    return this.words.has(word.toUpperCase());
  }

  size(): number {
    return this.words.size;
  }
}
