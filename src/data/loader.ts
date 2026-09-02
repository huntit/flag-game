// Data loader for tiles and dictionary

import type { TileData } from '../engine/types';
import { Dictionary } from '../engine/dictionary';
import tilesData from '../../data/tiles.json';

export async function loadTileData(): Promise<TileData> {
  return tilesData as TileData;
}

/**
 * The full word list ships as-is; Dictionary keeps only the lengths that can
 * be played on the largest board this device will ever show — 2–9 on a phone,
 * 2–11 anywhere the 11×11 board is reachable. No network lookup during play.
 */
export async function loadDictionary(maxWordLength: number): Promise<Dictionary> {
  const base = import.meta.env.BASE_URL || '/';
  return Dictionary.loadFromFile(`${base}data/words.txt`, maxWordLength);
}
