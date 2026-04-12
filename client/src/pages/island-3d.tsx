/**
 * Island 3D Page — full 3D island exploration with terrain, harvestables, and decorations.
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';

export default function Island3DPage() {
  const [seed, setSeed] = useState(() => {
    // Use URL param or default
    const params = new URLSearchParams(window.location.search);
    return params.get('seed') || 'grudge-island-' + Date.now().toString(36);
  });
  const [inputSeed, setInputSeed] = useState(seed);
  const [_, navigate] = useLocation();

  const handleNewSeed = () => {
    if (inputSeed.trim()) {
      setSeed(inputSeed.trim());
    }
  };

  const handleRandomSeed = () => {
    const newSeed = 'island-' + Math.random().toString(36).slice(2, 10);
    setInputSeed(newSeed);
    setSeed(newSeed);
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
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Island3DRenderer seed={seed} />
      </div>
    </div>
  );
}
