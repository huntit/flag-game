// Data loader for tiles and dictionary

import type { TileData } from '../engine/types';
import { Dictionary } from '../engine/dictionary';
import { MIN_WORD_LENGTH, MAX_WORD_LENGTH } from '../engine/types';
import tilesData from '../../data/tiles.json';

export async function loadTileData(): Promise<TileData> {
  return tilesData as TileData;
}

export async function loadDictionary(): Promise<Dictionary> {
  // Filter at load to 2–11 for the 11×11 board. Keep the full words.txt file in repo.
  const base = import.meta.env.BASE_URL || '/';
  const response = await fetch(`${base}data/words.txt`);
  const text = await response.text();
  const words = text
    .split('\n')
    .map(line => line.trim().toUpperCase())
    .filter(word => word.length >= MIN_WORD_LENGTH && word.length <= MAX_WORD_LENGTH);
  
  return new Dictionary(words);
}
