// Main App component

import { useState, useEffect } from 'react';
import { loadTileData, loadDictionary } from './data/loader';
import { Dictionary } from './engine/dictionary';
import type { TileData } from './engine/types';
import Menu from './components/Menu';
import Game from './components/Game';
import OnlineMode from './components/OnlineMode';
import './App.css';

export type GameMode = 'menu' | 'hotseat' | 'vs-ai' | 'online';
export type AIOpponent = 'greedy' | 'hunter' | 'sleeper';

function App() {
  const [tileData, setTileData] = useState<TileData | null>(null);
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [aiOpponent, setAIOpponent] = useState<AIOpponent>('hunter');

  useEffect(() => {
    async function loadData() {
      try {
        const [tiles, dict] = await Promise.all([
          loadTileData(),
          loadDictionary(),
        ]);
        setTileData(tiles);
        setDictionary(dict);
      } catch (error) {
        console.error('Failed to load game data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <h1>Flag</h1>
        <p>Loading game data...</p>
      </div>
    );
  }

  if (!tileData || !dictionary) {
    return (
      <div className="app-error">
        <h1>Error</h1>
        <p>Failed to load game data. Please refresh.</p>
      </div>
    );
  }

  if (gameMode === 'menu') {
    return (
      <Menu
        onSelectMode={(mode, opponent) => {
          setGameMode(mode);
          if (opponent) setAIOpponent(opponent);
        }}
      />
    );
  }

  if (gameMode === 'online') {
    return <OnlineMode onBackToMenu={() => setGameMode('menu')} />;
  }

  return (
    <Game
      tileData={tileData}
      dictionary={dictionary}
      mode={gameMode}
      aiOpponent={aiOpponent}
      onBackToMenu={() => setGameMode('menu')}
    />
  );
}

export default App;
