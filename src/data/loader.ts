// Data loader for tiles and dictionary

import type { TileData } from '../engine/types';
import { Dictionary } from '../engine/dictionary';
import tilesData from '../../data/tiles.json';

export async function loadTileData(): Promise<TileData> {
  return tilesData as TileData;
}

export async function loadDictionary(): Promise<Dictionary> {
  // Load words.txt and filter to length 2-9
  const response = await fetch('/data/words.txt');
  const text = await response.text();
  const words = text
    .split('\n')
    .map(line => line.trim().toUpperCase())
    .filter(word => word.length >= 2 && word.length <= 9);
  
  return new Dictionary(words);
}
