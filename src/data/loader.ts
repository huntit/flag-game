// Data loader for tiles and dictionary

import type { TileData } from '../engine/types';
import { Dictionary } from '../engine/dictionary';
import tilesData from '../../data/tiles.json';

export async function loadTileData(): Promise<TileData> {
  return tilesData as TileData;
}

/**
 * The full word list ships as-is; Dictionary keeps only the lengths that fit
 * a 9×9 board (2–9). No network lookup happens during play.
 */
export async function loadDictionary(): Promise<Dictionary> {
  const base = import.meta.env.BASE_URL || '/';
  return Dictionary.loadFromFile(`${base}data/words.txt`);
}
