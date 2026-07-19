/**
 * LobbyMiniMap — pirate open-world minimap.
 *
 * Draws all lobby islands from LOBBY_ISLANDS SSOT, player arrow, capture flags,
 * and a detail panel (contents + activities + game zones).
 * Default focus: Shipwreck Cove (wrecked pirate ship island).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Map as MapIcon, Ship, X } from 'lucide-react';
import type { Island3DEngine } from '../engine/Island3DEngine';
import {
  LOBBY_ISLANDS,
  SHIPWRECK_ISLAND,
  findNearestLobbyIsland,
  getDefaultFocusIslandId,
  lobbyIslandRadius,
  lobbyIslandWorldPos,
  type LobbyIslandDef,
} from '@shared/definitions/lobbyIslands';
import {
  FACTION_LOBBY_ISLANDS,
  factionIslandWorldOrigin,
} from '@shared/definitions/factionLobbyIslands';

const MAP_SIZE = 168;
const PAD = 10;

export interface LobbyMiniMapProps {
  engine: Island3DEngine | null;
  /** Start with detail open on shipwreck (player is looking at wreck) */
  defaultFocusId?: string;
  collapsed?: boolean;
}

function worldToCanvas(
  wx: number,
  wz: number,
  center: { x: number; z: number },
  half: number,
  size: number,
  pad: number,
): { x: number; y: number } {
  const usable = size - pad * 2;
  // Top-down: +X right, +Z down on map (screen Y)
  const nx = (wx - center.x) / (half * 2) + 0.5;
  const nz = (wz - center.z) / (half * 2) + 0.5;
  return {
    x: pad + nx * usable,
    y: pad + nz * usable,
  };
}

function drawCompass(ctx: CanvasRenderingContext2D, size: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = 'bold 9px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', size / 2, 11);
  ctx.restore();
}

export function LobbyMiniMap({
  engine,
  defaultFocusId = getDefaultFocusIslandId(),
  collapsed: collapsedProp,
}: LobbyMiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [collapsed, setCollapsed] = useState(collapsedProp ?? false);
  const [selectedId, setSelectedId] = useState<string | null>(defaultFocusId);
  const [detailOpen, setDetailOpen] = useState(true);
  const [nearId, setNearId] = useState<string | null>(null);
  const [playerXZ, setPlayerXZ] = useState({ x: 0, z: 0, yaw: 0 });

  const bounds = useMemo(() => {
    const b = engine?.getLobbyMapBounds?.() ?? null;
    if (b) return { center: { x: b.center.x, z: b.center.z }, size: { x: b.size.x, z: b.size.z } };
    // Fallback until lobby loads
    return { center: { x: 0, z: 0 }, size: { x: 200, z: 200 } };
  }, [engine, playerXZ.x, playerXZ.z]);

  const selected: LobbyIslandDef | null = useMemo(() => {
    if (!selectedId) return null;
    return LOBBY_ISLANDS.find((i) => i.id === selectedId) ?? null;
  }, [selectedId]);

  // Poll player + nearest island
  useEffect(() => {
    if (!engine) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 80) return;
      last = t;
      const pos = engine.character?.getPosition();
      if (!pos) return;
      const yaw = engine.character?.getCameraYaw?.() ?? 0;
      setPlayerXZ({ x: pos.x, z: pos.z, yaw });
      const b = engine.getLobbyMapBounds?.();
      if (b) {
        const near = findNearestLobbyIsland(pos.x, pos.z, b.center, b.size);
        setNearId(near?.id ?? null);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const b = engine?.getLobbyMapBounds?.() ?? bounds;
    const center = { x: b.center.x, z: b.center.z };
    const sizeV = { x: b.size.x, z: b.size.z };
    const half = Math.max(sizeV.x, sizeV.z) * 0.52;

    // Ocean
    const g = ctx.createRadialGradient(MAP_SIZE / 2, MAP_SIZE / 2, 10, MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE * 0.7);
    g.addColorStop(0, '#0e4a6e');
    g.addColorStop(0.55, '#0a355f');
    g.addColorStop(1, '#061a30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Soft grid
    ctx.strokeStyle = 'rgba(56,189,248,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const p = PAD + ((MAP_SIZE - PAD * 2) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(p, PAD);
      ctx.lineTo(p, MAP_SIZE - PAD);
      ctx.moveTo(PAD, p);
      ctx.lineTo(MAP_SIZE - PAD, p);
      ctx.stroke();
    }

    // Islands
    for (const island of LOBBY_ISLANDS) {
      const wp = lobbyIslandWorldPos(island, center, sizeV);
      const rWorld = lobbyIslandRadius(island, sizeV);
      const c = worldToCanvas(wp.x, wp.z, center, half, MAP_SIZE, PAD);
      const r = Math.max(6, (rWorld / (half * 2)) * (MAP_SIZE - PAD * 2));

      const isSel = island.id === selectedId;
      const isNear = island.id === nearId;

      ctx.beginPath();
      ctx.ellipse(c.x, c.y, r * 1.15, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fillStyle = island.color + (isSel ? 'ee' : isNear ? 'cc' : '99');
      ctx.fill();
      if (isSel || isNear) {
        ctx.strokeStyle = isSel ? '#fef3c7' : '#94a3b8';
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.stroke();
      }

      // Shipwreck icon mark
      if (island.id === SHIPWRECK_ISLAND.id) {
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.moveTo(c.x - 4, c.y + 2);
        ctx.lineTo(c.x + 5, c.y + 1);
        ctx.lineTo(c.x + 3, c.y - 3);
        ctx.lineTo(c.x - 2, c.y - 2);
        ctx.closePath();
        ctx.fill();
        // Mast
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + 1);
        ctx.lineTo(c.x - 1, c.y - 6);
        ctx.stroke();
      }

      // Faction race island — crown pip
      if (island.tags?.includes('faction')) {
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - r * 0.55);
        ctx.lineTo(c.x + 3.5, c.y - r * 0.2);
        ctx.lineTo(c.x - 3.5, c.y - r * 0.2);
        ctx.closePath();
        ctx.fill();
      }

      // Capture flag pip
      if (island.capturePointId && engine?.lobbyCapture) {
        const pt = engine.lobbyCapture.points.find((p) => p.id === island.capturePointId);
        if (pt) {
          const owner =
            pt.owner === 'player' ? '#22c55e' : pt.owner === 'enemy' ? '#ef4444' : '#94a3b8';
          ctx.fillStyle = owner;
          ctx.beginPath();
          ctx.arc(c.x, c.y - r * 0.35, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Outer ring — 6 race faction lobby islands (production)
    for (const fi of FACTION_LOBBY_ISLANDS) {
      const origin = factionIslandWorldOrigin(fi, center, sizeV);
      const c = worldToCanvas(origin.x, origin.z, center, half, MAP_SIZE, PAD);
      const r = 7;
      const hex = `#${(fi.bannerColor >>> 0).toString(16).padStart(6, '0')}`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(254,243,199,0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Crown
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - r - 2);
      ctx.lineTo(c.x + 3, c.y - r + 3);
      ctx.lineTo(c.x - 3, c.y - r + 3);
      ctx.closePath();
      ctx.fill();
    }

    // Player arrow
    const pc = worldToCanvas(playerXZ.x, playerXZ.z, center, half, MAP_SIZE, PAD);
    ctx.save();
    ctx.translate(pc.x, pc.y);
    // Yaw: camera yaw 0 looks -Z in Three → up on map if +Z is down
    ctx.rotate(-playerXZ.yaw);
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    drawCompass(ctx, MAP_SIZE);

    // Border
    ctx.strokeStyle = 'rgba(251,191,36,0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, MAP_SIZE - 1.5, MAP_SIZE - 1.5);
  }, [engine, bounds, selectedId, nearId, playerXZ]);

  useEffect(() => {
    paint();
  }, [paint]);

  const hitTest = (clientX: number, clientY: number): LobbyIslandDef | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = ((clientX - rect.left) / rect.width) * MAP_SIZE;
    const my = ((clientY - rect.top) / rect.height) * MAP_SIZE;
    const b = engine?.getLobbyMapBounds?.() ?? bounds;
    const center = { x: b.center.x, z: b.center.z };
    const sizeV = { x: b.size.x, z: b.size.z };
    const half = Math.max(sizeV.x, sizeV.z) * 0.52;

    let best: LobbyIslandDef | null = null;
    let bestD = 18;
    for (const island of LOBBY_ISLANDS) {
      const wp = lobbyIslandWorldPos(island, center, sizeV);
      const c = worldToCanvas(wp.x, wp.z, center, half, MAP_SIZE, PAD);
      const d = Math.hypot(mx - c.x, my - c.y);
      if (d < bestD) {
        bestD = d;
        best = island;
      }
    }
    return best;
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      setSelectedId(hit.id);
      setDetailOpen(true);
    }
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-amber-700/50 bg-black/80 px-2.5 py-1.5 text-[11px] font-semibold text-amber-100 shadow-lg backdrop-blur-md hover:bg-black/90"
        title="Open lobby minimap"
      >
        <MapIcon className="h-3.5 w-3.5 text-amber-400" />
        Map
        {nearId === SHIPWRECK_ISLAND.id && (
          <Ship className="h-3 w-3 text-orange-300" />
        )}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5 max-w-[min(92vw,20rem)]">
      <div className="rounded-2xl border border-amber-700/45 bg-black/85 shadow-xl backdrop-blur-md overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/10 px-2.5 py-1.5">
          <MapIcon className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-300/90">
            Lobby Map
          </span>
          <span className="text-[9px] text-slate-500 truncate">
            {nearId
              ? LOBBY_ISLANDS.find((i) => i.id === nearId)?.shortName
              : 'Open water'}
          </span>
          <button
            type="button"
            className="ml-auto text-slate-400 hover:text-white p-0.5"
            onClick={() => setCollapsed(true)}
            title="Collapse"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={MAP_SIZE}
          height={MAP_SIZE}
          className="block cursor-pointer"
          onClick={onCanvasClick}
          data-testid="lobby-minimap"
          title="Click an island for contents & activities"
        />

        <div className="flex flex-wrap gap-1 px-2 py-1.5 border-t border-white/5">
          {LOBBY_ISLANDS.map((isl) => (
            <button
              key={isl.id}
              type="button"
              onClick={() => {
                setSelectedId(isl.id);
                setDetailOpen(true);
              }}
              className={`text-[8px] px-1.5 py-0.5 rounded-md border transition-colors ${
                selectedId === isl.id
                  ? 'border-amber-500/60 bg-amber-900/40 text-amber-100'
                  : 'border-white/10 text-slate-400 hover:text-slate-200'
              }`}
              style={{ borderLeftColor: isl.color, borderLeftWidth: 2 }}
            >
              {isl.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel — what the island has + what we do there */}
      {detailOpen && selected && (
        <div className="w-full rounded-2xl border border-amber-700/40 bg-black/90 shadow-xl backdrop-blur-md overflow-hidden">
          <div className="flex items-start gap-2 px-2.5 py-2 border-b border-white/10">
            <div
              className="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: selected.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-white truncate">{selected.name}</h3>
                {selected.id === SHIPWRECK_ISLAND.id && (
                  <span title="Pirate ship wreck">
                    <Ship className="h-3 w-3 text-orange-300 shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-[9px] text-amber-200/80 leading-snug">{selected.role}</p>
            </div>
            <button
              type="button"
              className="text-slate-500 hover:text-white p-0.5"
              onClick={() => setDetailOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-2.5 py-2 space-y-2 max-h-56 overflow-y-auto">
            <p className="text-[10px] text-slate-300 leading-relaxed">{selected.description}</p>

            <div>
              <p className="text-[8px] uppercase tracking-wider text-slate-500 mb-0.5">Game zones</p>
              <div className="flex flex-wrap gap-1">
                {selected.gameZones.map((z) => (
                  <span
                    key={z}
                    className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300/90 border border-slate-700"
                  >
                    {z.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[8px] uppercase tracking-wider text-slate-500 mb-0.5">On this island</p>
              <ul className="text-[9px] text-slate-300 space-y-0.5 list-disc pl-3">
                {selected.contents.landmarks.slice(0, 4).map((l) => (
                  <li key={l}>{l}</li>
                ))}
                {selected.contents.structures.slice(0, 3).map((s) => (
                  <li key={s} className="text-slate-400">
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {(selected.contents.resources.length > 0 ||
              selected.contents.inhabitants.length > 0) && (
              <div className="grid grid-cols-1 gap-1">
                {selected.contents.resources.length > 0 && (
                  <p className="text-[9px] text-emerald-400/90">
                    <span className="text-slate-500">Resources · </span>
                    {selected.contents.resources.join(' · ')}
                  </p>
                )}
                {selected.contents.inhabitants.length > 0 && (
                  <p className="text-[9px] text-rose-300/80">
                    <span className="text-slate-500">Inhabitants · </span>
                    {selected.contents.inhabitants.slice(0, 4).join(' · ')}
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-[8px] uppercase tracking-wider text-slate-500 mb-1">
                What we do here
              </p>
              <ul className="space-y-1.5">
                {selected.activities.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] uppercase tracking-wide text-amber-500/90 font-semibold">
                        {a.kind.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-medium text-white">{a.title}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-snug mt-0.5">{a.detail}</p>
                    {a.hint && (
                      <p className="text-[8px] text-cyan-500/80 mt-0.5 font-mono">{a.hint}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-1 border-t border-white/10 py-1 text-[9px] text-slate-500 hover:text-slate-300"
            onClick={() => setDetailOpen(false)}
          >
            <ChevronDown className="h-3 w-3" />
            Hide details
          </button>
        </div>
      )}

      {!detailOpen && selected && (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="text-[9px] text-amber-400/90 hover:text-amber-300 px-1"
        >
          Show {selected.shortName} details
        </button>
      )}
    </div>
  );
}
