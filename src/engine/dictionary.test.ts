// Dictionary loading and lookup locks.
//
// The live word list is data/words.txt. It stays whole in the repo (words of
// length 2-28); the loader is what narrows to 2-11 for the 11x11 board.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Dictionary, isLoadableWord } from './dictionary';
import { MIN_WORD_LENGTH, MAX_WORD_LENGTH, BOARD_SIZE } from './types';

const WORDS_PATH = resolve(__dirname, '../../data/words.txt');

describe('load filter', () => {
  it('accepts word lengths 2 through 11', () => {
    expect(MIN_WORD_LENGTH).toBe(2);
    expect(MAX_WORD_LENGTH).toBe(11);
    expect(MAX_WORD_LENGTH).toBe(BOARD_SIZE);

    expect(isLoadableWord('AT')).toBe(true);
    expect(isLoadableWord('ABCDEFGHIJK')).toBe(true); // 11
  });

  it('rejects words that cannot fit on the board or are not A-Z', () => {
    expect(isLoadableWord('A')).toBe(false);
    expect(isLoadableWord('ABCDEFGHIJKL')).toBe(false); // 12
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
    expect(dictionary.size()).toBeLessThan(allLines.length);
    expect(dictionary.size()).toBe(143261);
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
    // Present in the source file, but 12 letters cannot fit on an 11x11 board.
    expect(allLines.map(w => w.trim()).includes('ABBREVIATED')).toBe(true);
    expect(dictionary.isValid('ABBREVIATED')).toBe(true); // 11 letters
    expect(dictionary.isValid('ABBREVIATES')).toBe(true); // 11 letters
    expect(dictionary.isValid('ABBREVIATING')).toBe(false); // 12 letters
  });
});
