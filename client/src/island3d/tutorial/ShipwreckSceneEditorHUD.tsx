/**
 * ShipwreckSceneEditorHUD — zones / nodes / NPCs / prefabs / pathfinder / XYZ gizmo.
 */
import { useEffect, useState } from 'react';
import {
  SHIPWRECK_PREFAB_CATALOG,
  type ShipwreckPrefabKind,
  type Xyz,
} from '@shared/definitions/shipwreckScene';
import type { ShipwreckSceneRuntime } from './ShipwreckSceneRuntime';
import type { GizmoMode } from './ShipwreckGizmo';
import {
  Box,
  MapPin,
  Move,
  Navigation,
  Eye,
  EyeOff,
  Download,
  Plus,
  Users,
  Layers,
  Route,
} from 'lucide-react';

export interface ShipwreckSceneEditorHUDProps {
  runtime: ShipwreckSceneRuntime | null;
  editorMode: boolean;
  onEditorModeChange: (on: boolean) => void;
}

export function ShipwreckSceneEditorHUD({
  runtime,
  editorMode,
  onEditorModeChange,
}: ShipwreckSceneEditorHUDProps) {
  const [tab, setTab] = useState<'zones' | 'nodes' | 'npcs' | 'prefabs' | 'paths'>('prefabs');
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [xyz, setXyz] = useState<Xyz>({ x: 0, y: 0, z: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navDebug, setNavDebug] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [showPaths, setShowPaths] = useState(true);
  const [pathPreview, setPathPreview] = useState(0);

  useEffect(() => {
    if (!runtime) return;
    const id = window.setInterval(() => {
      const p = runtime.getSelectedXyz();
      if (p) setXyz({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) });
      setSelectedId(runtime.selectedId);
    }, 100);
    return () => clearInterval(id);
  }, [runtime]);

  if (!runtime) return null;

  const def = runtime.sceneDef;
  const list =
    tab === 'zones' ? def.zones.map((z) => ({ id: z.id, label: z.name, sub: z.kind }))
    : tab === 'nodes' ? def.nodes.map((n) => ({ id: n.id, label: n.name, sub: n.kind }))
    : tab === 'npcs' ? def.npcs.map((n) => ({ id: n.id, label: n.name, sub: n.behavior }))
    : tab === 'prefabs' ? def.prefabs.map((p) => ({ id: p.id, label: p.name, sub: p.kind }))
    : def.paths.map((p) => ({ id: p.id, label: p.name, sub: `${p.points.length} pts` }));

  const applyXyz = () => {
    if (!selectedId) return;
    runtime.setXyz(selectedId, xyz);
  };

  const select = (id: string) => {
    runtime.select(id);
    setSelectedId(id);
    const ent = runtime.entities.get(id);
    if (ent) {
      setXyz({
        x: +ent.object.position.x.toFixed(2),
        y: +ent.object.position.y.toFixed(2),
        z: +ent.object.position.z.toFixed(2),
      });
    }
  };

  const deployAtSelectionOrOrigin = (kind: ShipwreckPrefabKind) => {
    const at = runtime.getSelectedXyz() ?? def.playerSpawn;
    const id = runtime.deployPrefab(kind, {
      x: at.x + 2,
      y: at.y,
      z: at.z + 2,
    });
    select(id);
  };

  return (
    <div className="pointer-events-auto w-[min(94vw,20rem)] flex flex-col gap-1.5 max-h-[min(78vh,36rem)]">
      {/* Mode strip */}
      <div className="rounded-xl border border-sky-700/45 bg-black/85 backdrop-blur-md px-2.5 py-2 flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-300">
          Shipwreck Scene
        </span>
        <button
          type="button"
          onClick={() => {
            const next = !editorMode;
            onEditorModeChange(next);
            runtime.setEditorMode(next);
          }}
          className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
            editorMode
              ? 'bg-amber-800/80 border-amber-500/50 text-amber-100'
              : 'bg-slate-800 border-slate-600 text-slate-300'
          }`}
        >
          {editorMode ? 'EDIT ON' : 'EDIT OFF'}
        </button>
      </div>

      {editorMode && (
        <div className="rounded-xl border border-white/10 bg-black/90 backdrop-blur-md overflow-hidden flex flex-col min-h-0">
          {/* Gizmo modes */}
          <div className="flex gap-1 px-2 py-1.5 border-b border-white/10">
            {(['translate', 'rotate', 'scale'] as GizmoMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setGizmoMode(m);
                  runtime.setGizmoMode(m);
                }}
                className={`flex-1 text-[9px] py-1 rounded-md font-semibold uppercase ${
                  gizmoMode === m
                    ? 'bg-sky-800 text-sky-100'
                    : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                {m === 'translate' ? 'Move' : m === 'rotate' ? 'Rot' : 'Scale'}
              </button>
            ))}
          </div>

          {/* XYZ */}
          <div className="px-2 py-1.5 border-b border-white/10 space-y-1">
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <Move className="w-3 h-3" />
              XYZ location
              <span className="ml-auto text-slate-500 truncate max-w-[8rem]">
                {selectedId ?? 'none selected'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <label key={axis} className="text-[8px] text-slate-500 uppercase">
                  {axis}
                  <input
                    type="number"
                    step={0.1}
                    value={xyz[axis]}
                    onChange={(e) =>
                      setXyz((prev) => ({ ...prev, [axis]: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full mt-0.5 rounded bg-slate-900 border border-slate-700 px-1 py-0.5 text-[10px] text-white font-mono"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={applyXyz}
              disabled={!selectedId}
              className="w-full text-[10px] py-1 rounded-md bg-sky-800/90 text-sky-50 font-semibold disabled:opacity-40"
            >
              Apply XYZ
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(
              [
                ['zones', MapPin],
                ['nodes', Box],
                ['npcs', Users],
                ['prefabs', Plus],
                ['paths', Route],
              ] as const
            ).map(([t, Icon]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 flex justify-center ${
                  tab === t ? 'text-amber-300 bg-white/5' : 'text-slate-500'
                }`}
                title={t}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-36 px-1 py-1 space-y-0.5">
            {list.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                className={`w-full text-left px-2 py-1 rounded-md text-[10px] ${
                  selectedId === item.id
                    ? 'bg-amber-900/40 text-amber-100 border border-amber-700/40'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="font-medium">{item.label}</span>
                <span className="text-slate-500 ml-1">{item.sub}</span>
              </button>
            ))}
          </div>

          {/* Prefab deploy palette */}
          {tab === 'prefabs' && (
            <div className="border-t border-white/10 px-2 py-1.5">
              <p className="text-[8px] uppercase text-slate-500 mb-1">Deploy prefab</p>
              <div className="flex flex-wrap gap-1">
                {SHIPWRECK_PREFAB_CATALOG.map((p) => (
                  <button
                    key={p.kind}
                    type="button"
                    onClick={() => deployAtSelectionOrOrigin(p.kind)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-200 hover:border-sky-500"
                    title={p.name}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Node deploy */}
          {tab === 'nodes' && (
            <div className="border-t border-white/10 px-2 py-1.5 flex flex-wrap gap-1">
              {(['stick', 'stone', 'chest', 'fiber'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    const at = runtime.getSelectedXyz() ?? def.playerSpawn;
                    const id = runtime.deployNode(k, {
                      x: at.x + 1.5,
                      y: 0.15,
                      z: at.z + 1.5,
                    });
                    select(id);
                  }}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/50 border border-emerald-700 text-emerald-100"
                >
                  + {k}
                </button>
              ))}
            </div>
          )}

          {/* Pathfinder / debug */}
          <div className="border-t border-white/10 px-2 py-1.5 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                const next = !navDebug;
                setNavDebug(next);
                runtime.showNavDebug(next);
              }}
              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" />
              Nav {navDebug ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !showZones;
                setShowZones(next);
                runtime.showZones(next);
              }}
              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 flex items-center gap-1"
            >
              {showZones ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Zones
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !showPaths;
                setShowPaths(next);
                runtime.showPaths(next);
              }}
              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 flex items-center gap-1"
            >
              <Route className="w-3 h-3" />
              Paths
            </button>
            <button
              type="button"
              onClick={() => {
                const from = def.playerSpawn;
                const to = def.nodes[0]?.transform.position ?? { x: 10, y: 1, z: 10 };
                const pts = runtime.pathTo(from, to);
                setPathPreview(pts.length);
              }}
              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200"
            >
              Test path ({pathPreview} pts)
            </button>
            <button
              type="button"
              onClick={() => {
                const json = runtime.exportSceneJson();
                const blob = new Blob([json], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'shipwreck-scene.json';
                a.click();
              }}
              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-100 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
          </div>
        </div>
      )}

      {/* Play summary when edit off */}
      {!editorMode && (
        <div className="rounded-xl border border-white/10 bg-black/75 px-2.5 py-2 text-[9px] text-slate-400 space-y-0.5">
          <p>
            <span className="text-amber-300 font-semibold">{def.zones.length}</span> zones ·{' '}
            <span className="text-emerald-300 font-semibold">{def.nodes.length}</span> nodes ·{' '}
            <span className="text-rose-300 font-semibold">{def.npcs.length}</span> NPCs ·{' '}
            <span className="text-sky-300 font-semibold">{def.prefabs.length}</span> prefabs
          </p>
          <p className="text-slate-500">Pathfinder · behaviors · gizmo deploy — toggle EDIT</p>
        </div>
      )}
    </div>
  );
}
