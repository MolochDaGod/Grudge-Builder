/**
 * LobbyProductionHUD — production chrome for pirate open-world lobby:
 * edit / test / deploy entry strip (not a replacement for ModePlayHUD).
 */
import { Hammer, Play, Rocket, FlaskConical, Map, Users } from 'lucide-react';

export interface LobbyProductionHUDProps {
  characterName?: string;
  mapLabel?: string;
  editorMode?: boolean;
  onEdit?: () => void;
  onTest?: () => void;
  onDeploy?: () => void;
  onOpenEntry?: () => void;
  prefabCount?: number;
  waterLevel?: number;
  oceanFloorLevel?: number;
}

export function LobbyProductionHUD({
  characterName = 'Captain',
  mapLabel = 'Pirate Open World',
  editorMode = false,
  onEdit,
  onTest,
  onDeploy,
  onOpenEntry,
  prefabCount,
  waterLevel = 0,
  oceanFloorLevel = -24,
}: LobbyProductionHUDProps) {
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-40 flex flex-col gap-2 max-w-[min(92vw,22rem)]">
      <div className="pointer-events-auto rounded-2xl border border-amber-700/45 bg-black/80 backdrop-blur-md px-3 py-2.5 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <Map className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] uppercase tracking-widest text-amber-300/90 font-semibold">
            Production Lobby
          </span>
          {editorMode && (
            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-200 border border-amber-600/40">
              EDIT
            </span>
          )}
        </div>
        <div className="text-sm text-white font-medium truncate">{mapLabel}</div>
        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
          <Users className="w-3 h-3" />
          {characterName}
          {prefabCount != null && (
            <span className="text-slate-500">· {prefabCount} prefabs</span>
          )}
        </div>
        <div className="text-[9px] text-cyan-400/80 font-mono mt-1">
          water Y={waterLevel} · floor Y={oceanFloorLevel} · TI shore falloff
        </div>
      </div>

      <div className="pointer-events-auto flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onOpenEntry}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-700/90 text-white border border-emerald-500/50 hover:bg-emerald-600"
          title="Character select + destinations"
        >
          <Play className="w-3.5 h-3.5" />
          Entry
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-amber-800/80 text-amber-100 border border-amber-600/50 hover:bg-amber-700"
          title="Build mode: units, siege, sand shovel"
        >
          <Hammer className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={onTest}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-800/90 text-slate-200 border border-slate-600/50 hover:bg-slate-700"
          title="Node / scene test tools"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Test
        </button>
        <button
          type="button"
          onClick={onDeploy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-sky-900/80 text-sky-100 border border-sky-600/40 hover:bg-sky-800"
          title="Production play client"
        >
          <Rocket className="w-3.5 h-3.5" />
          Deploy / Play
        </button>
      </div>

      <p className="pointer-events-none text-[9px] text-slate-500 leading-snug px-1">
        Every mesh is a prefab. Sand = shovel height. Water = TI beach→pier→deep.
        Build → Units / Siege / Monsters to place.
      </p>
    </div>
  );
}
