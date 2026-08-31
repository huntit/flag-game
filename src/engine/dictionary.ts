// Dictionary for word validation.
//
// Backed by a sorted array so that the move generator can ask prefix questions
// ("is there any word starting with CRO?") without building a trie. A trie over
// 143k words costs tens of megabytes of Map nodes, which is the wrong trade on
// an iPhone; binary search over the sorted array is O(log n) and the array is
// the only copy of the word list we keep in memory.

import { MIN_WORD_LENGTH, MAX_WORD_LENGTH } from './types';

/** A half-open slice [lo, hi) of the sorted word list sharing a common prefix. */
export interface PrefixRange {
  lo: number;
  hi: number;
}

const LETTERS_ONLY = /^[A-Z]+$/;

/** A word is loadable if it is A–Z only and fits on the board. */
export function isLoadableWord(word: string): boolean {
  return (
    word.length >= MIN_WORD_LENGTH &&
    word.length <= MAX_WORD_LENGTH &&
    LETTERS_ONLY.test(word)
  );
}

export class Dictionary {
  private readonly sorted: string[];

  constructor(words: Iterable<string>) {
    const unique = new Set<string>();
    for (const raw of words) {
      const word = raw.trim().toUpperCase();
      if (isLoadableWord(word)) unique.add(word);
    }
    this.sorted = Array.from(unique).sort();
  }

  /** Parse a newline-delimited word list. Handles CRLF and stray blank lines. */
  static fromText(text: string): Dictionary {
    return new Dictionary(text.split('\n'));
  }

  static async loadFromFile(path: string): Promise<Dictionary> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load dictionary from ${path}: ${response.status}`);
    }
    return Dictionary.fromText(await response.text());
  }

  isValid(word: string): boolean {
    const target = word.toUpperCase();
    let lo = 0;
    let hi = this.sorted.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const value = this.sorted[mid];
      if (value === target) return true;
      if (value < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }

  size(): number {
    return this.sorted.length;
  }

  /** The range covering every word in the dictionary. */
  fullRange(): PrefixRange {
    return { lo: 0, hi: this.sorted.length };
  }

  /**
   * Narrow `range` (all words sharing a prefix of length `depth`) to those whose
   * next character is `letter`. Returns an empty range when no word continues
   * that way, which is what prunes the move generator's search.
   */
  narrow(range: PrefixRange, letter: string, depth: number): PrefixRange {
    const lo = this.lowerBound(range, depth, letter);
    const hi = this.lowerBound({ lo, hi: range.hi }, depth, nextChar(letter));
    return { lo, hi };
  }

  /** Does any word remain in this range? */
  hasWords(range: PrefixRange): boolean {
    return range.hi > range.lo;
  }

  /**
   * Is the prefix defining `range` itself a word of exactly `length` letters?
   * Words sharing a prefix sort with the shortest first, so an exact-length
   * match can only sit at `range.lo`.
   */
  isCompleteWord(range: PrefixRange, length: number): boolean {
    return range.hi > range.lo && this.sorted[range.lo].length === length;
  }

  /** First index in [range.lo, range.hi) whose char at `depth` is >= `ch`. */
  private lowerBound(range: PrefixRange, depth: number, ch: string): number {
    let lo = range.lo;
    let hi = range.hi;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const word = this.sorted[mid];
      // Words shorter than the prefix sort first, so treat "no character" as
      // smaller than every letter.
      if (word.length <= depth || word[depth] < ch) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

function nextChar(ch: string): string {
  return String.fromCharCode(ch.charCodeAt(0) + 1);
}
