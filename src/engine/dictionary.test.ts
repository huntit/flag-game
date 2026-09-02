// Dictionary loading and lookup locks.
//
// The live word list is data/words.txt. It stays whole in the repo (words of
// length 2-28); the loader is what narrows to 2-9 for the 9x9 board.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Dictionary, isLoadableWord } from './dictionary';
import { MIN_WORD_LENGTH, MAX_WORD_LENGTH, BOARD_SIZE } from './types';

const WORDS_PATH = resolve(__dirname, '../../data/words.txt');

describe('load filter', () => {
  it('accepts word lengths 2 through 9', () => {
    expect(MIN_WORD_LENGTH).toBe(2);
    expect(MAX_WORD_LENGTH).toBe(9);
    expect(MAX_WORD_LENGTH).toBe(BOARD_SIZE);

    expect(isLoadableWord('AT')).toBe(true);
    expect(isLoadableWord('ABCDEFGHI')).toBe(true); // 9
  });

  it('rejects words that cannot fit on the board or are not A-Z', () => {
    expect(isLoadableWord('A')).toBe(false);
    expect(isLoadableWord('ABCDEFGHIJ')).toBe(false); // 10
    expect(isLoadableWord('ABCDEFGHIJK')).toBe(false); // 11
    expect(isLoadableWord('CO-OP')).toBe(false);
    expect(isLoadableWord("DON'T")).toBe(false);
    expect(isLoadableWord('')).toBe(false);
  });

  it('normalises case and trims stray whitespace, including CRLF', () => {
    const dictionary = Dictionary.fromText('cat\r\n  dog  \n\nAT\n');
    expect(dictionary.isValid('CAT')).toBe(true);
    expect(dictionary.isValid('cat')).toBe(true);
    expect(dictionary.isValid('DOG')).toBe(true);
    expect(dictionary.isValid('AT')).toBe(true);
    expect(dictionary.size()).toBe(3);
  });

  it('drops duplicates', () => {
    expect(Dictionary.fromText('CAT\nCAT\ncat\n').size()).toBe(1);
  });
});

describe('lookup', () => {
  const dictionary = new Dictionary(['AT', 'CAT', 'CATS', 'CATTLE', 'DOG', 'ZZZ']);

  it('answers exact membership', () => {
    expect(dictionary.isValid('CAT')).toBe(true);
    expect(dictionary.isValid('CATT')).toBe(false);
    expect(dictionary.isValid('AARDVARK')).toBe(false);
    expect(dictionary.isValid('AA')).toBe(false); // sorts before AT
    expect(dictionary.isValid('ZZZZ')).toBe(false); // sorts after everything
  });

  it('narrows prefix ranges for the move generator', () => {
    let range = dictionary.fullRange();
    range = dictionary.narrow(range, 'C', 0);
    expect(dictionary.hasWords(range)).toBe(true);
    expect(dictionary.isCompleteWord(range, 1)).toBe(false);

    range = dictionary.narrow(range, 'A', 1);
    range = dictionary.narrow(range, 'T', 2);
    expect(dictionary.isCompleteWord(range, 3)).toBe(true); // CAT

    const dead = dictionary.narrow(range, 'X', 3);
    expect(dictionary.hasWords(dead)).toBe(false);

    const alive = dictionary.narrow(range, 'S', 3);
    expect(dictionary.isCompleteWord(alive, 4)).toBe(true); // CATS
  });

  it('does not report a longer word as a complete shorter one', () => {
    let range = dictionary.fullRange();
    for (const [depth, letter] of ['C', 'A', 'T', 'T'].entries()) {
      range = dictionary.narrow(range, letter, depth);
    }
    expect(dictionary.hasWords(range)).toBe(true); // CATTLE lives here
    expect(dictionary.isCompleteWord(range, 4)).toBe(false); // CATT is not a word
  });
});

describe('data/words.txt', () => {
  const raw = readFileSync(WORDS_PATH, 'utf-8');
  const allLines = raw.split('\n').filter(line => line.trim().length > 0);

  it('keeps the full word list in the repo', () => {
    // The file must not be trimmed to the playable subset.
    expect(allLines.length).toBe(175030);
    expect(allLines.some(word => word.trim().length > MAX_WORD_LENGTH)).toBe(true);
  });

  it('loads only the words that fit the board', () => {
    const dictionary = Dictionary.fromText(raw);
    expect(dictionary.size()).toBeLessThan(143261);
    expect(dictionary.size()).toBeGreaterThan(100000);
  });

  it('validates real words a player would try', () => {
    const dictionary = Dictionary.fromText(raw);
    for (const word of ['AT', 'CAT', 'STAR', 'QUARTZ', 'JAZZY', 'FLAG', 'ZA', 'QI', 'OX']) {
      expect(dictionary.isValid(word), `${word} should be a word`).toBe(true);
    }
  });

  it('rejects non-words and words too long for the board', () => {
    const dictionary = Dictionary.fromText(raw);
    for (const word of ['CD', 'AO', 'TG', 'ZQX', 'ASDFG']) {
      expect(dictionary.isValid(word), `${word} should not be a word`).toBe(false);
    }
    // Present in the source file, but 11 letters cannot fit on a 9×9 board.
    expect(allLines.map(w => w.trim()).includes('ABBREVIATED')).toBe(true);
    expect(dictionary.isValid('ABBREVIATED')).toBe(false); // 11 letters
    expect(dictionary.isValid('ABBREVIATES')).toBe(false); // 11 letters
    expect(dictionary.isValid('ABBREVIATING')).toBe(false); // 12 letters
    expect(dictionary.isValid('ABDICATED')).toBe(true); // 9 letters
  });
});

describe('in-place indexing', () => {
  const raw = readFileSync(WORDS_PATH, 'utf-8');

  /**
   * The shipped list is already sorted, unique and uppercase, so it must take
   * the scan path that allocates no intermediate strings. If this ever fails
   * the dictionary still works — it just quietly costs ~12MB more to build,
   * which is exactly the spike the scan exists to avoid.
   */
  it('indexes the shipped word list in place rather than falling back', () => {
    const scanned = Dictionary.fromText(raw);
    // The fallback path rebuilds a blob of just the loadable words; the scan
    // keeps the whole file. Comparing sizes is how we tell which path ran.
    const rebuilt = new Dictionary(raw.split('\n'));
    expect(scanned.size()).toBe(rebuilt.size());
    expect(Dictionary.usedInPlaceIndex(scanned)).toBe(true);
    expect(Dictionary.usedInPlaceIndex(rebuilt)).toBe(false);
  });

  it('gives identical answers on both paths', () => {
    const scanned = Dictionary.fromText(raw);
    const rebuilt = new Dictionary(raw.split('\n'));

    // Every word, read back in order, must match between the two.
    expect(scanned.size()).toBe(rebuilt.size());
    for (let i = 0; i < scanned.size(); i += 997) {
      expect(scanned.wordAt(i)).toBe(rebuilt.wordAt(i));
    }
    expect(scanned.wordAt(0)).toBe(rebuilt.wordAt(0));
    expect(scanned.wordAt(scanned.size() - 1)).toBe(rebuilt.wordAt(rebuilt.size() - 1));

    for (const word of ['AA', 'ZYZZYVAS', 'FLAG', 'QUIZ', 'ABHORS', 'NOTAWORD', 'XQZ']) {
      expect(scanned.isValid(word), word).toBe(rebuilt.isValid(word));
    }

    // Prefix narrowing has to agree too — it is what prunes the AI's search.
    for (const prefix of ['C', 'CR', 'CRO', 'ZZ', 'QU', 'A']) {
      let a = scanned.fullRange();
      let b = rebuilt.fullRange();
      for (let depth = 0; depth < prefix.length; depth++) {
        a = scanned.narrow(a, prefix[depth], depth);
        b = rebuilt.narrow(b, prefix[depth], depth);
      }
      expect(a.hi - a.lo, prefix).toBe(b.hi - b.lo);
      expect(scanned.isCompleteWord(a, prefix.length), prefix).toBe(
        rebuilt.isCompleteWord(b, prefix.length)
      );
    }
  });

  it('stays sorted after the board-length filter drops longer words', () => {
    const dictionary = Dictionary.fromText(raw);
    for (let i = 1; i < dictionary.size(); i += 499) {
      expect(dictionary.wordAt(i - 1) < dictionary.wordAt(i)).toBe(true);
    }
  });

  it('falls back when the text is not already clean and sorted', () => {
    // Lowercase needs normalising.
    const lower = Dictionary.fromText('at\nate\ntea');
    expect(Dictionary.usedInPlaceIndex(lower)).toBe(false);
    expect(lower.isValid('ATE')).toBe(true);

    // Out of order.
    const unsorted = Dictionary.fromText('TEA\nATE\nAT');
    expect(Dictionary.usedInPlaceIndex(unsorted)).toBe(false);
    expect(unsorted.size()).toBe(3);
    expect(unsorted.wordAt(0)).toBe('AT');

    // Duplicated.
    const duped = Dictionary.fromText('AT\nAT\nATE');
    expect(Dictionary.usedInPlaceIndex(duped)).toBe(false);
    expect(duped.size()).toBe(2);

    // Windows line endings carry a stray CR.
    const crlf = Dictionary.fromText('AT\r\nATE\r\nTEA');
    expect(Dictionary.usedInPlaceIndex(crlf)).toBe(false);
    expect(crlf.isValid('TEA')).toBe(true);

    // Clean, sorted and unique: the scan handles it, with or without a
    // trailing newline.
    for (const text of ['AT\nATE\nTEA', 'AT\nATE\nTEA\n']) {
      const clean = Dictionary.fromText(text);
      expect(Dictionary.usedInPlaceIndex(clean)).toBe(true);
      expect(clean.size()).toBe(3);
      expect(clean.isValid('ATE')).toBe(true);
      expect(clean.isValid('AT')).toBe(true);
      expect(clean.isValid('TE')).toBe(false);
    }
  });

  it('skips words too long for the board without falling back', () => {
    // ABCDEFGHIJKL is 12 letters: filtered out, but no reason to normalise.
    const dictionary = Dictionary.fromText('AT\nABCDEFGHIJKL\nATE');
    expect(Dictionary.usedInPlaceIndex(dictionary)).toBe(true);
    expect(dictionary.size()).toBe(2);
    expect(dictionary.isValid('ABCDEFGHIJKL')).toBe(false);
  });
});
