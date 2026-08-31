#!/usr/bin/env node
// flag-sim - headless AI-vs-AI simulation for balance analysis.
//
//   npm run sim -- --games 200 --p1 greedy --p2 hunter --threshold 8 --seed 1 --out ./out/

import * as fs from 'fs';
import * as path from 'path';
import { parseArgs } from 'util';
import { Dictionary } from '../engine/dictionary';
import { initializeGame, mulberry32, setRandomSource } from '../engine/game';
import { executeAction } from '../engine/actions';
import { planAIAction } from '../engine/ai';
import type { AIPersonality, FlagPost, TileData } from '../engine/types';

interface CLIOptions {
  games: number;
  p1: AIPersonality;
  p2: AIPersonality;
  threshold: number;
  seed: number;
  out: string;
  noSwap: boolean;
}

interface GameResult {
  gameId: number;
  seed: number;
  p1: AIPersonality;
  p2: AIPersonality;
  first: AIPersonality;
  winner: 'P1' | 'P2' | 'draw';
  endReason: string;
  capturer: 'P1' | 'P2' | null;
  capturerWon: boolean | null;
  scoreP1: number;
  scoreP2: number;
  turns: number;
  playsP1: number;
  drawsP1: number;
  discardsP1: number;
  playsP2: number;
  drawsP2: number;
  discardsP2: number;
  wordLengths: number[];
  wordScores: number[];
  twoLetterPlays: number;
  captureWordLength: number | null;
  captureWordScore: number | null;
  capturePost: FlagPost | null;
  captureTurn: number | null;
  captureWasRefused: boolean | null;
  legalCapturesRefused: number;
  /** Which seat each personality occupied, so swapped runs can be unwound. */
  seatOfP1Personality: 'P1' | 'P2';
}

function loadData() {
  const tilesPath = path.join(process.cwd(), 'data/tiles.json');
  const tilesData: TileData = JSON.parse(fs.readFileSync(tilesPath, 'utf-8'));

  const wordsPath = path.join(process.cwd(), 'data/words.txt');
  const dictionary = Dictionary.fromText(fs.readFileSync(wordsPath, 'utf-8'));

  return { tilesData, dictionary };
}

/**
 * Play one game to completion. `seatPersonalities[0]` sits at P1.
 * The whole game is driven from `seed`, so a run is reproducible.
 */
function runGame(
  tilesData: TileData,
  dictionary: Dictionary,
  seatPersonalities: [AIPersonality, AIPersonality],
  threshold: number,
  gameId: number,
  seed: number,
  options: CLIOptions
): GameResult {
  setRandomSource(mulberry32(seed));
  const state = initializeGame(tilesData);

  const plays = [0, 0];
  const draws = [0, 0];
  const discards = [0, 0];
  const wordLengths: number[] = [];
  const wordScores: number[] = [];
  let twoLetterPlays = 0;
  const capturesRefused = [0, 0];

  let capturer: 'P1' | 'P2' | null = null;
  let captureWordLength: number | null = null;
  let captureWordScore: number | null = null;
  let capturePost: FlagPost | null = null;
  let captureTurn: number | null = null;

  // Safety net: a stalled game is reported as turn_cap rather than silently
  // skewing the summary. See drawWouldHelp() in engine/ai.ts.
  const maxTurns = 1000;
  let hitTurnCap = false;

  while (!state.gameOver && state.turnCount < maxTurns) {
    const seat = state.currentPlayer;
    const livePostBefore = state.livePost;
    const { action, legalPlays } = planAIAction(state, seatPersonalities[seat], dictionary, threshold);

    const captureWasAvailable = legalPlays.some(p => p.captures);

    if (action.type === 'draw') {
      draws[seat]++;
      discards[seat] += action.discardTiles?.length ?? 0;
    } else if (action.type === 'play') {
      plays[seat]++;
    }

    const result = executeAction(state, action, dictionary);
    if (!result.success) {
      console.error(`game ${gameId}: ${action.type} failed: ${result.error}`);
      break;
    }

    const played = state.lastPlay;
    const tookCapture = played?.captures ?? false;
    if (captureWasAvailable && !tookCapture) {
      capturesRefused[seat]++;
    }

    if (action.type === 'play' && played) {
      for (const word of played.words) {
        wordLengths.push(word.word.length);
        wordScores.push(word.score);
        if (word.word.length === 2) twoLetterPlays++;
      }

      if (tookCapture) {
        capturer = state.players[seat].id;
        const longest = [...played.words].sort((a, b) => b.word.length - a.word.length)[0];
        captureWordLength = longest?.word.length ?? null;
        captureWordScore = played.totalScore;
        capturePost = livePostBefore;
        captureTurn = state.turnCount;
      }
    }
  }

  if (!state.gameOver && state.turnCount >= maxTurns) {
    hitTurnCap = true;
    console.error(`game ${gameId} (seed ${seed}) hit the ${maxTurns}-turn cap without ending`);
  }

  const capturerSeat = capturer === 'P1' ? 0 : capturer === 'P2' ? 1 : null;

  return {
    gameId,
    seed,
    p1: options.p1,
    p2: options.p2,
    first: seatPersonalities[0],
    winner: state.winner ?? 'draw',
    endReason: state.endReason ?? (hitTurnCap ? 'turn_cap' : 'unknown'),
    capturer,
    capturerWon: capturer ? capturer === state.winner : null,
    scoreP1: state.players[0].score,
    scoreP2: state.players[1].score,
    turns: state.turnCount,
    playsP1: plays[0],
    drawsP1: draws[0],
    discardsP1: discards[0],
    playsP2: plays[1],
    drawsP2: draws[1],
    discardsP2: discards[1],
    wordLengths,
    wordScores,
    twoLetterPlays,
    captureWordLength,
    captureWordScore,
    capturePost,
    captureTurn,
    captureWasRefused: capturerSeat === null ? null : capturesRefused[capturerSeat] > 0,
    legalCapturesRefused: capturesRefused[0] + capturesRefused[1],
    seatOfP1Personality: seatPersonalities[0] === options.p1 ? 'P1' : 'P2',
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computeSummary(results: GameResult[], options: CLIOptions) {
  const games = results.length;
  const draws = results.filter(r => r.winner === 'draw').length;
  const p1Wins = results.filter(r => r.winner === 'P1').length;

  // Win rate for the --p1 personality, whichever seat it occupied.
  const personalityWins = results.filter(r =>
    r.seatOfP1Personality === 'P1' ? r.winner === 'P1' : r.winner === 'P2'
  ).length;

  const captureGames = results.filter(r => r.capturer !== null);
  const capturerWins = captureGames.filter(r => r.capturerWon).length;

  const scoresP1 = results.map(r => r.scoreP1);
  const scoresP2 = results.map(r => r.scoreP2);
  const allScores = [...scoresP1, ...scoresP2];

  const totalPlays = results.reduce((sum, r) => sum + r.playsP1 + r.playsP2, 0);
  const totalDraws = results.reduce((sum, r) => sum + r.drawsP1 + r.drawsP2, 0);

  const allWordLengths = results.flatMap(r => r.wordLengths);
  const totalTwoLetterPlays = results.reduce((sum, r) => sum + r.twoLetterPlays, 0);
  const captureTurns = captureGames
    .map(r => r.captureTurn)
    .filter((t): t is number => t !== null);

  return {
    games,
    p1: options.p1,
    p2: options.p2,
    threshold: options.threshold,
    seed: options.seed,
    swapped: !options.noSwap && options.p1 !== options.p2,
    drawRate: draws / games,
    p1WinRate: p1Wins / games,
    personalityWinRate: personalityWins / games,
    captureEndRate: results.filter(r => r.endReason === 'capture').length / games,
    bagEndRate: results.filter(r => r.endReason === 'bag').length / games,
    postsFullEndRate: results.filter(r => r.endReason === 'posts_full').length / games,
    doublePassEndRate: results.filter(r => r.endReason === 'double_pass').length / games,
    /** Should be 0. Anything else means a game stalled without ending. */
    turnCapGames: results.filter(r => r.endReason === 'turn_cap').length,
    capturerWinRate: captureGames.length > 0 ? capturerWins / captureGames.length : null,
    meanScore: mean(allScores),
    medianScore: median(allScores),
    meanScoreP1: mean(scoresP1),
    meanScoreP2: mean(scoresP2),
    medianScoreP1: median(scoresP1),
    medianScoreP2: median(scoresP2),
    meanTurns: mean(results.map(r => r.turns)),
    meanDrawPlayRatio: totalPlays > 0 ? totalDraws / totalPlays : null,
    meanWordLength: mean(allWordLengths),
    twoLetterPlayRate: allWordLengths.length > 0 ? totalTwoLetterPlays / allWordLengths.length : 0,
    meanCaptureTurn: captureTurns.length > 0 ? mean(captureTurns) : null,
    refusedCaptureRate: results.filter(r => r.legalCapturesRefused > 0).length / games,
  };
}

function main() {
  const { values } = parseArgs({
    options: {
      games: { type: 'string', default: '100' },
      p1: { type: 'string', default: 'greedy' },
      p2: { type: 'string', default: 'greedy' },
      threshold: { type: 'string', default: '8' },
      seed: { type: 'string', default: '1' },
      out: { type: 'string', default: './out' },
      'no-swap': { type: 'boolean', default: false },
    },
  });

  const options: CLIOptions = {
    games: parseInt(values.games as string, 10),
    p1: values.p1 as AIPersonality,
    p2: values.p2 as AIPersonality,
    threshold: parseInt(values.threshold as string, 10),
    seed: parseInt(values.seed as string, 10),
    out: values.out as string,
    noSwap: values['no-swap'] as boolean,
  };

  const { tilesData, dictionary } = loadData();
  console.log(`Dictionary: ${dictionary.size()} playable words`);
  console.log(`Running ${options.games} games: ${options.p1} vs ${options.p2} (threshold ${options.threshold}, seed ${options.seed})`);

  // Identical personalities have nothing to swap.
  const swap = !options.noSwap && options.p1 !== options.p2;
  if (swap) console.log('Swapping seats for half the games');

  const results: GameResult[] = [];
  for (let i = 0; i < options.games; i++) {
    const swapped = swap && i >= Math.floor(options.games / 2);
    const seats: [AIPersonality, AIPersonality] = swapped
      ? [options.p2, options.p1]
      : [options.p1, options.p2];

    results.push(
      runGame(tilesData, dictionary, seats, options.threshold, i + 1, options.seed + i, options)
    );

    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${options.games}`);
  }

  fs.mkdirSync(options.out, { recursive: true });
  fs.writeFileSync(
    path.join(options.out, 'games.jsonl'),
    results.map(r => JSON.stringify(r)).join('\n') + '\n'
  );

  const summary = computeSummary(results, options);
  fs.writeFileSync(path.join(options.out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

  const pct = (v: number | null) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
  const num = (v: number | null) => (v === null ? 'n/a' : v.toFixed(2));

  console.log('\n=== Summary ===');
  console.log(`Games                 ${summary.games}`);
  console.log(`Draw rate             ${pct(summary.drawRate)}`);
  console.log(`P1 (first) win rate   ${pct(summary.p1WinRate)}`);
  console.log(`${options.p1} win rate${' '.repeat(Math.max(1, 14 - options.p1.length))}${pct(summary.personalityWinRate)}`);
  console.log(`Capture end rate      ${pct(summary.captureEndRate)}`);
  console.log(`Bag end rate          ${pct(summary.bagEndRate)}`);
  console.log(`Posts-full end rate   ${pct(summary.postsFullEndRate)}`);
  console.log(`Double-pass end rate  ${pct(summary.doublePassEndRate)}`);
  console.log(`Stalled (turn cap)    ${summary.turnCapGames}`);
  console.log(`Capturer win rate     ${pct(summary.capturerWinRate)}`);
  console.log(`Mean / median score   ${num(summary.meanScore)} / ${num(summary.medianScore)}`);
  console.log(`Mean turns            ${num(summary.meanTurns)}`);
  console.log(`Draws per play        ${num(summary.meanDrawPlayRatio)}`);
  console.log(`Mean word length      ${num(summary.meanWordLength)}`);
  console.log(`Two-letter play rate  ${pct(summary.twoLetterPlayRate)}`);
  console.log(`Mean capture turn     ${num(summary.meanCaptureTurn)}`);
  console.log(`Refused-capture rate  ${pct(summary.refusedCaptureRate)}`);
  console.log(`\nWrote ${options.out}/games.jsonl and ${options.out}/summary.json`);
}

main();
