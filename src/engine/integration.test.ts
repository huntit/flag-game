// End-to-end locks against the data that actually ships: data/words.txt and
// data/tiles.json. Plays real games and checks every word and every point.

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Dictionary } from './dictionary';
import { initializeGame, mulberry32, setRandomSource, resetRandomSource, getBoardTile, getMarketTiles } from './game';
import { executeAction } from './actions';
import { selectAIAction } from './ai';
import { readWord, effectiveLetter } from './validator';
import type { AIPersonality, Letter, TileData } from './types';
import { BOARD_SIZE, RACK_MAX } from './types';

const tileData: TileData = JSON.parse(
  readFileSync(resolve(__dirname, '../../data/tiles.json'), 'utf-8')
);
const dictionary = Dictionary.fromText(
  readFileSync(resolve(__dirname, '../../data/words.txt'), 'utf-8')
);

/** Letter values straight from data/tiles.json — the only source of truth. */
const VALUES = new Map<string, number>(
  tileData.tileSets.wwf.tiles.map(t => [t.letter as string, t.value])
);

afterEach(() => {
  resetRandomSource();
});

describe('tile data', () => {
  it('is the WWF English bag with Word Eagle values', () => {
    const tiles = tileData.tileSets.wwf.tiles;
    const letterCount = tiles.reduce((sum, t) => sum + t.count, 0);
    expect(letterCount + tileData.tileSets.wwf.blanks.count).toBe(104);
    expect(tileData.tileSets.wwf.blanks.count).toBe(2);
    expect(tileData.tileSets.wwf.blanks.value).toBe(0);

    // Spot-check the values the scoring tests rely on.
    expect(VALUES.get('A')).toBe(1);
    expect(VALUES.get('Q')).toBe(10);
    expect(VALUES.get('Z')).toBe(10);
    expect(VALUES.get('X')).toBe(8);
    expect(VALUES.get('K')).toBe(5);
    expect(VALUES.get('V')).toBe(5);
  });
});

describe('real games', () => {
  const matchups: [AIPersonality, AIPersonality][] = [
    ['hunter', 'greedy'],
    ['greedy', 'sleeper'],
  ];

  it.each(matchups)(
    '%s vs %s: every scored word is in the word list and scores its letter values',
    (p1, p2) => {
      let wordsChecked = 0;
      let playsChecked = 0;

      for (let seed = 1; seed <= 3; seed++) {
        setRandomSource(mulberry32(seed * 3571));
        const state = initializeGame(tileData);
        const seats: [AIPersonality, AIPersonality] = [p1, p2];

        let guard = 0;
        while (!state.gameOver && guard < 600) {
          const seat = state.currentPlayer;
          const scoreBefore = state.players[seat].score;
          const rackBefore = state.players[seat].rack.length;

          const action = selectAIAction(state, seats[seat], dictionary, 8);
          const result = executeAction(state, action, dictionary);
          expect(result.success, `${action.type}: ${result.error}`).toBe(true);

          if (action.type === 'play' && state.lastPlay) {
            playsChecked++;
            let expectedTotal = 0;

            for (const word of state.lastPlay.words) {
              wordsChecked++;

              // Every word formed must be a real word of a playable length.
              expect(dictionary.isValid(word.word), `${word.word} is not in the word list`).toBe(true);
              expect(word.word.length).toBeGreaterThanOrEqual(2);
              expect(word.word.length).toBeLessThanOrEqual(BOARD_SIZE);

              // The word on the board must read as the word that was scored.
              const positions = word.positions;
              const horizontal = positions.length > 1 && positions[0].row === positions[1].row;
              const onBoard = readWord(state.board, positions[0], horizontal);
              expect(onBoard?.word).toBe(word.word);

              // Base score is the sum of letter values (blanks at 0); flag multipliers
              // apply to the capturing word only.
              const baseScore = positions.reduce((sum, pos) => {
                const tile = getBoardTile(state.board, pos)!;
                return sum + (tile.isBlank ? 0 : VALUES.get(effectiveLetter(tile) as Letter) ?? 0);
              }, 0);
              expect(word.baseScore ?? baseScore, `${word.word} base should be ${baseScore}`).toBe(baseScore);
              expect(word.score, `${word.word} should score ${baseScore * (word.flagMultiplier ?? 1)}`).toBe(
                baseScore * (word.flagMultiplier ?? 1)
              );
              expectedTotal += word.score;
            }

            expect(state.lastPlay.totalScore).toBe(expectedTotal);
            expect(state.players[seat].score).toBe(scoreBefore + expectedTotal);

            // A play spends tiles and never refills the rack.
            expect(state.players[seat].rack.length).toBe(
              rackBefore - action.placements.length
            );
          }

          guard++;
        }

        expect(state.gameOver).toBe(true);
        expect(['self_capture', 'second_steal', 'no_spare', 'bag_empty', 'swap_out']).toContain(state.endReason);
      }

      expect(playsChecked).toBeGreaterThan(20);
      expect(wordsChecked).toBeGreaterThan(20);
    },
    120_000
  );

  it('never exceeds the rack maximum or loses a tile', () => {
    setRandomSource(mulberry32(3571));
    const state = initializeGame(tileData);
    const totalTiles = 104;

    let guard = 0;
    while (!state.gameOver && guard < 600) {
      const action = selectAIAction(state, guard % 2 === 0 ? 'hunter' : 'greedy', dictionary, 8);
      expect(executeAction(state, action, dictionary).success).toBe(true);

      for (const player of state.players) {
        expect(player.rack.length).toBeLessThanOrEqual(RACK_MAX);
      }

      let onBoard = 0;
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (state.board[row][col]) onBoard++;
        }
      }

      const accounted =
        onBoard +
        state.bag.length +
        getMarketTiles(state.market).length +
        state.players[0].rack.length +
        state.players[1].rack.length;
      expect(accounted, 'every tile must be somewhere').toBe(totalTiles);

      guard++;
    }

    expect(state.gameOver).toBe(true);
  }, 120_000);
});
