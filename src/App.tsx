// Main App component

import { useEffect, useState } from 'react';
import { loadTileData, loadDictionary } from './data/loader';
import { Dictionary } from './engine/dictionary';
import type { TileData } from './engine/types';
import { PHONE_9, TABLET_11 } from './engine/variants';
import { deviceSupportsLargeBoard } from './components/useShell';
import Menu from './components/Menu';
import Game from './components/Game';
import OnlineMode from './components/OnlineMode';
import './App.css';

export type GameMode = 'menu' | 'hotseat' | 'vs-ai' | 'online';
export type AIOpponent = 'greedy' | 'hunter' | 'sleeper';

function App() {
  const [tileData, setTileData] = useState<TileData | null>(null);
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [aiOpponent, setAIOpponent] = useState<AIOpponent>('hunter');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      // Longest word the biggest board this device can reach will ever hold.
      const maxWordLength = deviceSupportsLargeBoard()
        ? TABLET_11.boardSize
        : PHONE_9.boardSize;

      try {
        const [tiles, dict] = await Promise.all([
          loadTileData(),
          loadDictionary(maxWordLength),
        ]);
        if (cancelled) return;
        setTileData(tiles);
        setDictionary(dict);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <div className="screen">
        <div className="screen-panel">
          <h1>Word Heist</h1>
          <p>Could not load the word list. Pull to refresh.</p>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!tileData || !dictionary) {
    return (
      <div className="screen">
        <div className="screen-panel">
          <h1>Word Heist</h1>
          <p>Loading words…</p>
        </div>
      </div>
    );
  }

  if (gameMode === 'menu') {
    return (
      <Menu
        onSelectMode={(mode, opponent) => {
          if (opponent) setAIOpponent(opponent);
          setGameMode(mode);
        }}
      />
    );
  }

  if (gameMode === 'online') {
    return <OnlineMode onHome={() => setGameMode('menu')} />;
  }

  return (
    <Game
      key={`${gameMode}-${aiOpponent}`}
      tileData={tileData}
      dictionary={dictionary}
      mode={gameMode}
      aiOpponent={aiOpponent}
      onBackToMenu={() => setGameMode('menu')}
    />
  );
}

export default App;
