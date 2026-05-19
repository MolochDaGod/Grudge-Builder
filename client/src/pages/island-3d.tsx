/**
 * Island 3D Page — full 3D island exploration with terrain, harvestables, and decorations.
 * Supports procedural seed-based islands, pre-built lobby maps, and persisted home islands.
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';
import type { Island3DMode } from '@/island3d/engine/Island3DEngine';
import { LOBBY_MAPS } from '@/island3d/engine/LobbyIslandLoader';
import { authHeaders } from '@/lib/grudgeBackend';
import { normalizeHomeIslandResponse } from '@/lib/homeIslandApi';
import { Loader2 } from 'lucide-react';

export default function Island3DPage() {
  const params = new URLSearchParams(window.location.search);
  const isHomeIslandMode = params.get('mode') === 'home-island';
  const islandIdParam = params.get('islandId') || '';
  const characterIdParam = params.get('characterId') || '';

  const [seed, setSeed] = useState(() => {
    return params.get('seed') || 'grudge-island-' + Date.now().toString(36);
  });
  const [inputSeed, setInputSeed] = useState(seed);
  const [mode, setMode] = useState<Island3DMode>(
    isHomeIslandMode ? 'procedural' : (params.get('mode') as Island3DMode) || 'procedural',
  );
  const [lobbyMapId, setLobbyMapId] = useState(
    params.get('map') || 'pirate-islands',
  );
  const [_, navigate] = useLocation();

  // Home-island state
  const [homeIsland, setHomeIsland] = useState<any>(null);
  const [homeIslandLoading, setHomeIslandLoading] = useState(isHomeIslandMode);

  useEffect(() => {
    if (!isHomeIslandMode) return;
    const load = async () => {
      setHomeIslandLoading(true);
      try {
        const url = islandIdParam
          ? `/api/islands/${islandIdParam}`
          : '/api/island';
        const res = await fetch(url, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const normalized = normalizeHomeIslandResponse(data);
          setHomeIsland(normalized);
          // Use island seed as the procedural seed so terrain matches
          setSeed(normalized.seed || data.seed || 'home-' + (islandIdParam || Date.now().toString(36)));
        }
      } catch (e) {
        console.error('[Island3D] Failed to load home island:', e);
      } finally {
        setHomeIslandLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (isHomeIslandMode && homeIslandLoading) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center flex-col gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-sm">Loading your home island...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => navigate(isHomeIslandMode ? '/home' : '/island')}
          className="text-gray-400 hover:text-white text-sm"
        >
          {isHomeIslandMode ? '← Hub' : '← 2D Island'}
        </button>
        <span className="text-gray-600">|</span>
        <h1 className="text-emerald-400 font-bold text-sm">
          {isHomeIslandMode
            ? `🏝 Home Island${homeIsland?.name ? ': ' + homeIsland.name : ''}`
            : '3D Island Explorer'}
        </h1>
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
          quality="medium"
          dayNight={{ dayDurationSeconds: 600, startTime: 0.35 }}
          enableCharacter={mode === 'procedural'}
        />
        {/* Home-island stats overlay */}
        {isHomeIslandMode && homeIsland && (
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur border border-emerald-800/50 rounded-xl px-4 py-3 text-xs text-slate-300 space-y-1 pointer-events-none">
            <div className="text-emerald-400 font-bold uppercase tracking-widest mb-1">Home Island</div>
            <div>🗺 {homeIsland.name || 'Unnamed Island'}</div>
            <div>⛏ {(homeIsland.state?.nodes || []).length} resource nodes</div>
            <div>🐾 {(homeIsland.state?.animals || []).length} animals</div>
            <div>🏕 Camp @ ({(homeIsland.state?.campPosition?.x ?? 0).toFixed(0)}, {(homeIsland.state?.campPosition?.y ?? 0).toFixed(0)})</div>
          </div>
        )}
      </div>
    </div>
  );
}
