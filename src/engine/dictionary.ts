// Dictionary for word validation.
//
// Backed by a sorted word list so the move generator can ask prefix questions
// ("is there any word starting with CRO?") without building a trie. A trie over
// 143k words costs tens of megabytes of Map nodes, which is the wrong trade on
// an iPhone.
//
// The words are NOT kept as 143k JavaScript strings. They are kept as the one
// text blob we already fetched, plus typed-array offsets into it. That matters
// twice over on a phone:
//
//   * steady state — one contiguous string plus ~700KB of typed arrays,
//     instead of ~3.5MB of individually boxed strings;
//   * peak — the old path built a 143k-element split array, then a Set, then a
//     sorted array, all live at once. Measured in Chrome that spike was ~12MB
//     above the text itself, and a spike is what gets a backgrounded Safari tab
//     discarded. Scanning the blob in place allocates essentially nothing.
//
// The shipped word list is already sorted, unique, uppercase and A-Z only, so
// the scan is the whole job. Nothing here *assumes* that: the scan checks as it
// goes and falls back to normalising and sorting if the list ever changes.

import { MIN_WORD_LENGTH } from './types';
import { MAX_BOARD_SIZE } from './variants';

/** A half-open slice [lo, hi) of the sorted word list sharing a common prefix. */
export interface PrefixRange {
  lo: number;
  hi: number;
}

const LETTERS_ONLY = /^[A-Z]+$/;
const CODE_A = 65;
const CODE_Z = 90;
const CODE_LF = 10;

/**
 * A word is loadable if it is A–Z only and fits on the board it is being
 * loaded for. `maxLength` is the board size of the variant in play: the phone
 * loads 2–9 and keeps its heap where the memory work below left it, while the
 * 11×11 boards load 2–11. Loading the longer words on a phone would cost the
 * saving for words that cannot physically be played there.
 */
export function isLoadableWord(word: string, maxLength: number = MAX_BOARD_SIZE): boolean {
  return (
    word.length >= MIN_WORD_LENGTH &&
    word.length <= maxLength &&
    LETTERS_ONLY.test(word)
  );
}

/** One line of the blob: already uppercase A–Z, or in need of normalising. */
const enum Line {
  Usable,
  /** A–Z but the wrong length for the board — skip it, no fallback needed. */
  Skip,
  /** Anything else (lowercase, digits, CR, punctuation) — normalise instead. */
  Dirty,
}

export class Dictionary {
  /**
   * The text the offsets point into: either the file exactly as fetched, or a
   * rebuilt blob when the input had to be normalised. Assigned once, by the
   * constructor or by indexInPlace, and never touched again.
   */
  private blob!: string;
  private starts!: Uint32Array;
  private lengths!: Uint8Array;
  private count!: number;
  private indexedInPlace = false;

  constructor(words: Iterable<string>, maxLength: number = MAX_BOARD_SIZE) {
    const unique = new Set<string>();
    for (const raw of words) {
      const word = raw.trim().toUpperCase();
      if (isLoadableWord(word, maxLength)) unique.add(word);
    }
    const sorted = Array.from(unique).sort();

    this.count = sorted.length;
    this.starts = new Uint32Array(this.count);
    this.lengths = new Uint8Array(this.count);
    let at = 0;
    for (let i = 0; i < this.count; i++) {
      this.starts[i] = at;
      this.lengths[i] = sorted[i].length;
      at += sorted[i].length;
    }
    this.blob = sorted.join('');
  }

  /**
   * Build straight from the fetched text, indexing it in place. Falls back to
   * the normalising constructor only if the text is not already the clean,
   * sorted, uppercase list we ship.
   */
  static fromText(text: string, maxLength: number = MAX_BOARD_SIZE): Dictionary {
    return (
      Dictionary.indexInPlace(text, maxLength) ?? new Dictionary(text.split('\n'), maxLength)
    );
  }

  /**
   * Index `text` in place: one pass, no intermediate strings. Returns null if
   * the text needs normalising (anything outside A–Z) or is not already sorted
   * and unique, in which case the caller takes the allocating path.
   */
  private static indexInPlace(text: string, maxLength: number): Dictionary | null {
    const total = text.length;
    // Upper bound on the word count: one per line, trimmed to size at the end.
    let lines = 0;
    for (let i = 0; i < total; i++) {
      if (text.charCodeAt(i) === CODE_LF) lines++;
    }

    const starts = new Uint32Array(lines + 1);
    const lengths = new Uint8Array(lines + 1);
    let count = 0;
    let previousStart = -1;
    let previousLength = 0;

    let from = 0;
    while (from <= total) {
      let to = text.indexOf('\n', from);
      if (to === -1) to = total;

      const kind = classify(text, from, to, maxLength);
      if (kind === Line.Dirty) return null;
      if (kind === Line.Usable) {
        const length = to - from;
        if (previousStart >= 0) {
          // Out of order, or a duplicate: not the list we ship, so normalise.
          if (compareLines(text, previousStart, previousLength, from, length) >= 0) return null;
        }
        starts[count] = from;
        lengths[count] = length;
        count++;
        previousStart = from;
        previousLength = length;
      }

      if (to === total) break;
      from = to + 1;
    }

    if (count === 0) return null;

    const dictionary: Dictionary = Object.create(Dictionary.prototype);
    // subarray is a view, not a copy: no second allocation to build the index.
    dictionary.blob = text;
    dictionary.starts = starts.subarray(0, count);
    dictionary.lengths = lengths.subarray(0, count);
    dictionary.count = count;
    dictionary.indexedInPlace = true;
    return dictionary;
  }

  static async loadFromFile(
    path: string,
    maxLength: number = MAX_BOARD_SIZE
  ): Promise<Dictionary> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load dictionary from ${path}: ${response.status}`);
    }
    return Dictionary.fromText(await response.text(), maxLength);
  }

  isValid(word: string): boolean {
    const target = word.toUpperCase();
    let lo = 0;
    let hi = this.count - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const order = this.compareAt(mid, target);
      if (order === 0) return true;
      if (order < 0) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }

  size(): number {
    return this.count;
  }

  /** The range covering every word in the dictionary. */
  fullRange(): PrefixRange {
    return { lo: 0, hi: this.count };
  }

  /**
   * Narrow `range` (all words sharing a prefix of length `depth`) to those whose
   * next character is `letter`. Returns an empty range when no word continues
   * that way, which is what prunes the move generator's search.
   */
  narrow(range: PrefixRange, letter: string, depth: number): PrefixRange {
    const code = letter.charCodeAt(0);
    const lo = this.lowerBound(range, depth, code);
    const hi = this.lowerBound({ lo, hi: range.hi }, depth, code + 1);
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
    return range.hi > range.lo && this.lengths[range.lo] === length;
  }

  /**
   * Did this dictionary come from the allocation-free scan, or the normalising
   * fallback? Only the tests care, but they care a lot: a silent fall back to
   * the slow path costs ~12MB of peak heap and nothing else would notice.
   */
  static usedInPlaceIndex(dictionary: Dictionary): boolean {
    return dictionary.indexedInPlace;
  }

  /** Read one word back out. Only for tests and debugging — play never needs it. */
  wordAt(index: number): string {
    const start = this.starts[index];
    return this.blob.slice(start, start + this.lengths[index]);
  }

  /**
   * Compare the stored word at `index` with `target`, without materialising the
   * stored word. Returns <0, 0 or >0 like a sort comparator.
   */
  private compareAt(index: number, target: string): number {
    const start = this.starts[index];
    const length = this.lengths[index];
    const shared = length < target.length ? length : target.length;
    for (let k = 0; k < shared; k++) {
      const a = this.blob.charCodeAt(start + k);
      const b = target.charCodeAt(k);
      if (a !== b) return a - b;
    }
    return length - target.length;
  }

  /** First index in [range.lo, range.hi) whose char at `depth` is >= `code`. */
  private lowerBound(range: PrefixRange, depth: number, code: number): number {
    let lo = range.lo;
    let hi = range.hi;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      // Words shorter than the prefix sort first, so treat "no character" as
      // smaller than every letter.
      const length = this.lengths[mid];
      if (length <= depth || this.blob.charCodeAt(this.starts[mid] + depth) < code) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

/** Classify one line of the blob without slicing it out. */
function classify(text: string, from: number, to: number, maxLength: number): Line {
  const length = to - from;
  for (let i = from; i < to; i++) {
    const code = text.charCodeAt(i);
    if (code < CODE_A || code > CODE_Z) return Line.Dirty;
  }
  if (length === 0) return Line.Skip;
  return length >= MIN_WORD_LENGTH && length <= maxLength ? Line.Usable : Line.Skip;
}

/** Compare two lines of the same blob by content. */
function compareLines(text: string, aFrom: number, aLen: number, bFrom: number, bLen: number): number {
  const shared = aLen < bLen ? aLen : bLen;
  for (let k = 0; k < shared; k++) {
    const a = text.charCodeAt(aFrom + k);
    const b = text.charCodeAt(bFrom + k);
    if (a !== b) return a - b;
  }
  return aLen - bLen;
}
