#!/usr/bin/env node
// flag-sim CLI - Headless simulation mode

import * as fs from 'fs';
import * as path from 'path';
import { parseArgs } from 'util';
import { Dictionary } from '../engine/dictionary';
import { initializeGame } from '../engine/game';
import { executeAction } from '../engine/actions';
import { selectAIAction } from '../engine/ai';
import type { AIPersonality, TileData } from '../engine/types';

interface CLIOptions {
  games: number;
  p1: AIPersonality;
  p2: AIPersonality;
  threshold: number;
  seed?: number;
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
  capturePost: string | null;
  captureTurn: number | null;
  captureWasRefused: boolean | null;
  legalCapturesRefused: number;
}

async function loadData() {
  // Load tiles data
  const tilesPath = path.join(process.cwd(), 'data/tiles.json');
  const tilesData: TileData = JSON.parse(fs.readFileSync(tilesPath, 'utf-8'));

  // Load dictionary
  const wordsPath = path.join(process.cwd(), 'data/words.txt');
  const wordsText = fs.readFileSync(wordsPath, 'utf-8');
  const words = wordsText
    .split('\n')
    .map((line: string) => line.trim().toUpperCase())
    .filter((word: string) => word.length >= 2 && word.length <= 11);
  const dictionary = new Dictionary(words);

  return { tilesData, dictionary };
}

function runGame(
  tilesData: TileData,
  dictionary: Dictionary,
  p1: AIPersonality,
  p2: AIPersonality,
  threshold: number,
  gameId: number,
  seed: number
): GameResult {
  const state = initializeGame(tilesData);
  const personalities = [p1, p2] as const;

  let playsP1 = 0, drawsP1 = 0, discardsP1 = 0;
  let playsP2 = 0, drawsP2 = 0, discardsP2 = 0;
  const wordLengths: number[] = [];
  const wordScores: number[] = [];
  let twoLetterPlays = 0;
  let capturer: 'P1' | 'P2' | null = null;
  let captureWordLength: number | null = null;
  let captureWordScore: number | null = null;
  let capturePost: string | null = null;
  let captureTurn: number | null = null;
  let legalCapturesRefused = 0;

  while (!state.gameOver) {
    const currentPlayer = state.players[state.currentPlayer];
    const personality = personalities[state.currentPlayer];

    const action = selectAIAction(state, personality, dictionary, threshold);

    // Track stats
    if (action.type === 'draw') {
      if (currentPlayer.id === 'P1') drawsP1++;
      else drawsP2++;
      
      if (action.discardTiles && action.discardTiles.length > 0) {
        if (currentPlayer.id === 'P1') discardsP1 += action.discardTiles.length;
        else discardsP2 += action.discardTiles.length;
      }
    } else if (action.type === 'play') {
      if (currentPlayer.id === 'P1') playsP1++;
      else playsP2++;
    }

    const result = executeAction(state, action, dictionary);
    if (!result.success) {
      console.error(`Action failed: ${result.error}`);
      break;
    }

    // Track word stats
    if (action.type === 'play' && state.moveHistory.length > 0) {
      // We need to extract word info from the validation
      // For now, simplified tracking
      const mainWordLength = action.placements.length;
      wordLengths.push(mainWordLength);
      
      if (mainWordLength === 2) {
        twoLetterPlays++;
      }

      // Check if this was a capture
      if (state.gameOver && state.endReason === 'capture') {
        capturer = currentPlayer.id;
        captureWordLength = mainWordLength;
        capturePost = state.livePost;
        captureTurn = state.turnCount;
      }
    }
  }

  return {
    gameId,
    seed,
    p1,
    p2,
    first: p1,
    winner: state.winner || 'draw',
    endReason: state.endReason || 'unknown',
    capturer,
    capturerWon: capturer ? (capturer === state.winner) : null,
    scoreP1: state.players[0].score,
    scoreP2: state.players[1].score,
    turns: state.turnCount,
    playsP1,
    drawsP1,
    discardsP1,
    playsP2,
    drawsP2,
    discardsP2,
    wordLengths,
    wordScores,
    twoLetterPlays,
    captureWordLength,
    captureWordScore,
    capturePost,
    captureTurn,
    captureWasRefused: null,
    legalCapturesRefused,
  };
}

function computeSummary(results: GameResult[]) {
  const games = results.length;
  const draws = results.filter(r => r.winner === 'draw').length;
  const p1Wins = results.filter(r => r.winner === 'P1').length;
  
  const captureEnds = results.filter(r => r.endReason === 'capture').length;
  const bagEnds = results.filter(r => r.endReason === 'bag').length;
  
  const captureGames = results.filter(r => r.capturer !== null);
  const capturerWins = captureGames.filter(r => r.capturerWon).length;
  
  const scores = results.flatMap(r => [r.scoreP1, r.scoreP2]);
  const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];
  
  const turns = results.map(r => r.turns);
  const meanTurns = turns.reduce((a, b) => a + b, 0) / turns.length;
  
  const totalPlays = results.reduce((sum, r) => sum + r.playsP1 + r.playsP2, 0);
  const totalDraws = results.reduce((sum, r) => sum + r.drawsP1 + r.drawsP2, 0);
  const meanDrawPlayRatio = totalDraws / totalPlays;
  
  const allWordLengths = results.flatMap(r => r.wordLengths);
  const meanWordLength = allWordLengths.reduce((a, b) => a + b, 0) / allWordLengths.length;
  
  const totalTwoLetterPlays = results.reduce((sum, r) => sum + r.twoLetterPlays, 0);
  const twoLetterPlayRate = totalTwoLetterPlays / totalPlays;
  
  const captureTurns = captureGames.map(r => r.captureTurn).filter(t => t !== null) as number[];
  const meanCaptureTurn = captureTurns.length > 0 
    ? captureTurns.reduce((a, b) => a + b, 0) / captureTurns.length 
    : null;

  return {
    games,
    drawRate: draws / games,
    p1WinRate: p1Wins / games,
    personalityWinRate: p1Wins / games, // Simplified for same personality
    captureEndRate: captureEnds / games,
    bagEndRate: bagEnds / games,
    capturerWinRate: captureGames.length > 0 ? capturerWins / captureGames.length : 0,
    meanScore,
    medianScore,
    meanTurns,
    meanDrawPlayRatio,
    meanWordLength,
    twoLetterPlayRate,
    meanCaptureTurn,
    refusedCaptureRate: 0, // TODO: Track this
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      games: { type: 'string', default: '100' },
      p1: { type: 'string', default: 'greedy' },
      p2: { type: 'string', default: 'greedy' },
      threshold: { type: 'string', default: '8' },
      seed: { type: 'string' },
      out: { type: 'string', default: './out' },
      'no-swap': { type: 'boolean', default: false },
    },
  });

  const options: CLIOptions = {
    games: parseInt(values.games as string),
    p1: values.p1 as AIPersonality,
    p2: values.p2 as AIPersonality,
    threshold: parseInt(values.threshold as string),
    seed: values.seed ? parseInt(values.seed) : undefined,
    out: values.out as string,
    noSwap: values['no-swap'] as boolean,
  };

  console.log('Loading data...');
  const { tilesData, dictionary } = await loadData();
  
  console.log(`Running ${options.games} games: ${options.p1} vs ${options.p2}`);
  console.log(`Threshold: ${options.threshold}`);

  const results: GameResult[] = [];

  for (let i = 0; i < options.games; i++) {
    const seed = options.seed !== undefined ? options.seed + i : Date.now() + i;
    const result = runGame(tilesData, dictionary, options.p1, options.p2, options.threshold, i + 1, seed);
    results.push(result);

    if ((i + 1) % 10 === 0) {
      console.log(`Completed ${i + 1}/${options.games} games`);
    }
  }

  // Write results
  fs.mkdirSync(options.out, { recursive: true });

  const jsonlPath = path.join(options.out, 'games.jsonl');
  const jsonlContent = results.map(r => JSON.stringify(r)).join('\n');
  fs.writeFileSync(jsonlPath, jsonlContent);

  const summary = computeSummary(results);
  const summaryPath = path.join(options.out, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Print summary
  console.log('\n=== Summary ===');
  console.log(`Games: ${summary.games}`);
  console.log(`P1 Win Rate: ${(summary.p1WinRate * 100).toFixed(1)}%`);
  console.log(`Draw Rate: ${(summary.drawRate * 100).toFixed(1)}%`);
  console.log(`Capture End Rate: ${(summary.captureEndRate * 100).toFixed(1)}%`);
  console.log(`Bag End Rate: ${(summary.bagEndRate * 100).toFixed(1)}%`);
  console.log(`Capturer Win Rate: ${(summary.capturerWinRate * 100).toFixed(1)}%`);
  console.log(`Mean Score: ${summary.meanScore.toFixed(1)}`);
  console.log(`Mean Turns: ${summary.meanTurns.toFixed(1)}`);
  console.log(`Mean Draw/Play Ratio: ${summary.meanDrawPlayRatio.toFixed(2)}`);
  console.log(`Mean Word Length: ${summary.meanWordLength.toFixed(1)}`);
  console.log(`Two-Letter Play Rate: ${(summary.twoLetterPlayRate * 100).toFixed(1)}%`);
  if (summary.meanCaptureTurn) {
    console.log(`Mean Capture Turn: ${summary.meanCaptureTurn.toFixed(1)}`);
  }
  console.log(`\nOutput: ${options.out}/`);
}

main().catch(console.error);
