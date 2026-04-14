/**
 * Island 3D Page — full 3D island exploration with terrain, harvestables, and decorations.
 * Supports both procedural seed-based islands and pre-built lobby maps.
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';
import type { Island3DMode } from '@/island3d/engine/Island3DEngine';
import { LOBBY_MAPS } from '@/island3d/engine/LobbyIslandLoader';

export default function Island3DPage() {
  const params = new URLSearchParams(window.location.search);
  const [seed, setSeed] = useState(() => {
    return params.get('seed') || 'grudge-island-' + Date.now().toString(36);
  });
  const [inputSeed, setInputSeed] = useState(seed);
  const [mode, setMode] = useState<Island3DMode>(
    (params.get('mode') as Island3DMode) || 'procedural',
  );
  const [lobbyMapId, setLobbyMapId] = useState(
    params.get('map') || 'pirate-islands',
  );
  const [_, navigate] = useLocation();

  const handleNewSeed = () => {
    if (inputSeed.trim()) {
      setSeed(inputSeed.trim());
      setMode('procedural');
    }
  };

  const handleRandomSeed = () => {
    const newSeed = 'island-' + Math.random().toString(36).slice(2, 10);
    setInputSeed(newSeed);
    setSeed(newSeed);
    setMode('procedural');
  };

  const handleLobbyMap = (mapId: string) => {
    setLobbyMapId(mapId);
    setMode('lobby');
    // Force re-render by updating seed key
    setSeed(`lobby-${mapId}-${Date.now()}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => navigate('/island')}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← 2D Island
        </button>
        <span className="text-gray-600">|</span>
        <h1 className="text-emerald-400 font-bold text-sm">3D Island Explorer</h1>
        <div className="flex-1" />

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
          <button
            onClick={() => { setMode('procedural'); setSeed(inputSeed); }}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              mode === 'procedural'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Procedural
          </button>
          <button
            onClick={() => handleLobbyMap(lobbyMapId)}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              mode === 'lobby'
                ? 'bg-amber-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Lobby Map
          </button>
        </div>

        {mode === 'procedural' ? (
          <>
            <input
              type="text"
              value={inputSeed}
              onChange={(e) => setInputSeed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNewSeed()}
              placeholder="Island seed..."
              className="bg-gray-800 border border-gray-700 text-white text-xs px-3 py-1.5 rounded w-48 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleNewSeed}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded"
            >
              Generate
            </button>
            <button
              onClick={handleRandomSeed}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded"
            >
              Random
            </button>
          </>
        ) : (
          <select
            value={lobbyMapId}
            onChange={(e) => handleLobbyMap(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-xs px-3 py-1.5 rounded focus:outline-none focus:border-amber-500"
          >
            {LOBBY_MAPS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Island3DRenderer
          seed={seed}
          mode={mode}
          lobbyMapId={lobbyMapId}
        />
      </div>
    </div>
  );
}
