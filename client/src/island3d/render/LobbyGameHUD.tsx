/**
 * LobbyGameHUD — thin wrapper; full RTS triple-mode lives in ModePlayHUD.
 */
import { useState } from 'react';
import type { Island3DEngine } from '../engine/Island3DEngine';
import type { ControlMode } from '../player/CharacterController3D';
import { ModePlayHUD } from './ModePlayHUD';

interface LobbyGameHUDProps {
  engine: Island3DEngine | null;
  characterName?: string;
  islandId?: string;
  multiplayerConnected?: boolean;
}

export function LobbyGameHUD({
  engine,
  characterName,
  islandId,
  multiplayerConnected,
}: LobbyGameHUDProps) {
  const [mode, setMode] = useState<ControlMode>('harvest');
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const captured = engine?.capturedPointCount ?? 0;
  const total = engine?.lobbyCapture?.points.length ?? 4;
  const sailing = engine?.lobbyShip?.isBoarded ?? false;

  return (
    <>
      <div className="absolute top-4 left-4 z-20 pointer-events-none max-w-xs">
        <div className="bg-black/75 backdrop-blur border border-amber-700/40 rounded-xl px-3 py-2 text-xs text-slate-200 space-y-1">
          <p className="font-bold text-amber-300 uppercase tracking-wide">
            {characterName || 'Captain'} · Open World
          </p>
          {islandId && <p className="text-slate-400">Island: {islandId}</p>}
          <p className="text-cyan-300">
            Capture {captured}/{total}
            {multiplayerConnected && <span className="text-emerald-400 ml-2">· Live</span>}
          </p>
          <p className="text-slate-500">
            {sailing
              ? '⛵ Deck — WASD · fish at rail · Tab soft-lock · E disembark'
              : 'Tab soft-lock · Z sheath · modes via HUD'}
          </p>
        </div>
      </div>

      <ModePlayHUD
        engine={engine}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          void engine?.character?.setControlMode(m);
          if (m !== 'build') {
            engine?.cancelBuilding();
            setSelectedBuildId(null);
          }
        }}
        characterName={characterName}
        selectedBuildId={selectedBuildId}
        onBuildSelect={(id) => setSelectedBuildId(id)}
        onBuildCancel={() => setSelectedBuildId(null)}
      />
    </>
  );
}
