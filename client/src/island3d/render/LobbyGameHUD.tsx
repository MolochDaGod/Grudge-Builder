/**
 * LobbyGameHUD — RTS build palette, sailing, capture status for pirate lobby.
 */
import type { Island3DEngine } from '../engine/Island3DEngine';
import type { PieceType } from '../building/BuildingSystem';

const BUILD_PIECES: { type: PieceType; label: string }[] = [
  { type: 'foundation', label: 'Foundation' },
  { type: 'wall', label: 'Wall' },
  { type: 'ceiling', label: 'Ceiling' },
  { type: 'stairs', label: 'Stairs' },
];

const PROP_ASSETS = [
  { id: 'watchtower', label: 'Watchtower' },
  { id: 'boat_dock', label: 'Dock' },
  { id: 'fireplace', label: 'Camp' },
];

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
  const captured = engine?.capturedPointCount ?? 0;
  const total = engine?.lobbyCapture?.points.length ?? 4;
  const sailing = engine?.lobbyShip?.isBoarded ?? false;

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 max-w-xs pointer-events-auto">
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
            ? '⛵ Deck — WASD walk · equip fishing pole · harvest LMB cast at railing · Tab combat swing · Space overboard · E disembark'
            : 'Swim · Ctrl dive · W climb hull · E south dock · capture · Tab build'}
        </p>
        <p className="text-slate-600 text-[10px]">
          PBR:{' '}
          <a
            href="https://polyhaven.com/textures"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-500/80 hover:text-cyan-400 underline"
          >
            Poly Haven
          </a>
          {' '}· Smugglers Cove coastal set
        </p>
      </div>

      <div className="bg-black/75 backdrop-blur border border-slate-700/50 rounded-xl p-2">
        <p className="text-[10px] text-slate-400 uppercase mb-1.5 px-1">RTS Build</p>
        <div className="flex flex-wrap gap-1">
          {BUILD_PIECES.map((p) => (
            <button
              key={p.type}
              type="button"
              onClick={() => engine?.startBuilding(p.type)}
              className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-emerald-800 text-slate-200 border border-slate-600"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {PROP_ASSETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => engine?.building?.startPropPlacement(p.id)}
              className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-cyan-900 text-slate-200 border border-slate-600"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => engine?.cancelBuilding()}
            className="px-2 py-1 text-[10px] rounded bg-red-950 hover:bg-red-900 text-red-200 border border-red-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}