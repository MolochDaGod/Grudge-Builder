/**
 * ZoneMiniMap — Tactical Infinity–style live corner minimap for Warlords sectors.
 *
 * North-up, player-centered heading arrow, mouse-wheel zoom.
 * Markers from zone population: islands, docks, NPC camps, enemy boats (ai_patrol),
 * shipwrecks, bosses. Same disclosure language as TI Minimap.tsx.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Island3DEngine } from '../engine/Island3DEngine';
import {
  getNodesByCategory,
  type IslandNode,
  type DockNode,
  type NPCCampNode,
  type AIPatrolNode,
  type ShipwreckNode,
  type BossArenaNode,
} from '@shared/definitions/zoneServerNodes';

export interface ZoneMiniMapProps {
  engine: Island3DEngine | null;
  size?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onExpand?: () => void;
  className?: string;
}

export interface ZoneMinimapMarker {
  name: string;
  x: number;
  z: number;
  color: string;
  kind: 'island' | 'ship' | 'boss' | 'trading' | 'dock' | 'camp' | 'wreck';
  radius: number;
}

const FACTION_COLORS: Record<string, string> = {
  crusade: '#c9a227',
  fabled: '#4a9eff',
  legion: '#e53935',
  worgen: '#9acd32',
  worgen2: '#9acd32',
  pirate: '#6b7280',
  hostile: '#ef4444',
  neutral: '#9aa0a6',
  contested: '#b06bd6',
};

const MIN_RANGE = 400;
const MAX_RANGE = 8000;

const POSITION_CLASS: Record<NonNullable<ZoneMiniMapProps['position']>, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

function bakeZoneMarkers(engine: Island3DEngine): ZoneMinimapMarker[] {
  const pop = engine.zonePopulation;
  if (!pop) return [];
  const out: ZoneMinimapMarker[] = [];

  for (const isl of getNodesByCategory<IslandNode>(pop, 'island')) {
    const r =
      isl.size === 'fortress' ? 8
      : isl.size === 'large' ? 6.5
      : isl.size === 'medium' ? 5
      : isl.size === 'small' ? 3.5
      : 2.5;
    out.push({
      name: isl.size === 'fortress' ? 'Fortress' : `Isle`,
      x: isl.position[0],
      z: isl.position[2],
      color: '#4ade80',
      kind: 'island',
      radius: r,
    });
  }

  for (const d of getNodesByCategory<DockNode>(pop, 'dock')) {
    out.push({
      name: d.name || 'Dock',
      x: d.position[0],
      z: d.position[2],
      color: '#fbbf24',
      kind: 'dock',
      radius: 2.5,
    });
  }

  for (const c of getNodesByCategory<NPCCampNode>(pop, 'npc_camp')) {
    out.push({
      name: c.name || 'Camp',
      x: c.position[0],
      z: c.position[2],
      color: FACTION_COLORS[c.faction] ?? FACTION_COLORS.neutral,
      kind: 'camp',
      radius: 3,
    });
  }

  for (const p of getNodesByCategory<AIPatrolNode>(pop, 'ai_patrol')) {
    if (!p.isShipPatrol) continue;
    // Prefer live marker position if engine moved the ship mesh
    const live = engine.zoneScene?.markers.get(p.id);
    const x = live?.position.x ?? p.position[0];
    const z = live?.position.z ?? p.position[2];
    out.push({
      name: 'Enemy ship',
      x,
      z,
      color: FACTION_COLORS[p.faction] ?? FACTION_COLORS.hostile,
      kind: 'ship',
      radius: 3,
    });
  }

  for (const w of getNodesByCategory<ShipwreckNode>(pop, 'shipwreck')) {
    out.push({
      name: 'Wreck',
      x: w.position[0],
      z: w.position[2],
      color: '#64748b',
      kind: 'wreck',
      radius: 2.5,
    });
  }

  for (const b of getNodesByCategory<BossArenaNode>(pop, 'boss_arena')) {
    out.push({
      name: b.bossName || 'Boss',
      x: b.position[0],
      z: b.position[2],
      color: '#ff5252',
      kind: 'boss',
      radius: 5,
    });
  }

  // Hidden mountain city / sector landmarks
  if (engine.hiddenMountainCity?.root) {
    const p = engine.hiddenMountainCity.root.position;
    out.push({
      name: 'Mountain City',
      x: p.x,
      z: p.z,
      color: '#a78bfa',
      kind: 'boss',
      radius: 6,
    });
  }
  if (engine.sectorEventLandmarks?.root) {
    engine.sectorEventLandmarks.root.children.forEach((ch) => {
      out.push({
        name: ch.name || 'Event',
        x: ch.position.x,
        z: ch.position.z,
        color: '#22d3ee',
        kind: 'trading',
        radius: 4,
      });
    });
  }

  return out;
}

export function ZoneMiniMap({
  engine,
  size = 200,
  position = 'top-right',
  onExpand,
  className = '',
}: ZoneMiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rangeRef = useRef(2800);
  const markersRef = useRef<ZoneMinimapMarker[]>([]);
  const rafRef = useRef(0);
  const [coords, setCoords] = useState({ x: 0, z: 0 });
  const [zoomPct, setZoomPct] = useState(100);
  const [islandCount, setIslandCount] = useState(0);
  const [shipCount, setShipCount] = useState(0);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
    rangeRef.current = Math.max(MIN_RANGE, Math.min(MAX_RANGE, rangeRef.current * factor));
    setZoomPct(Math.round((MIN_RANGE / rangeRef.current) * 100));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    canvas.addEventListener('wheel', onWheel, { passive: false });

    const r = size / 2;
    let frame = 0;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      frame++;
      const pos = engine.character?.getPosition();
      if (!pos) {
        ctx.clearRect(0, 0, size, size);
        return;
      }
      const yaw = engine.character?.getCameraYaw?.() ?? 0;
      if (frame % 8 === 0) {
        markersRef.current = bakeZoneMarkers(engine);
        setCoords({ x: Math.round(pos.x), z: Math.round(pos.z) });
        setIslandCount(markersRef.current.filter((m) => m.kind === 'island').length);
        setShipCount(markersRef.current.filter((m) => m.kind === 'ship').length);
      }

      const range = rangeRef.current;
      const pxPerUnit = r / range;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - 1, 0, Math.PI * 2);
      ctx.clip();

      const g = ctx.createRadialGradient(r, r, r * 0.1, r, r, r);
      g.addColorStop(0, '#0c2c4a');
      g.addColorStop(1, '#051422');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      // Grid
      ctx.strokeStyle = 'rgba(120,170,210,0.10)';
      ctx.lineWidth = 1;
      const grid = 500;
      const ox = ((-pos.x % grid) + grid) % grid;
      const oz = ((-pos.z % grid) + grid) % grid;
      for (let gx = ox; gx <= 2 * range; gx += grid) {
        const sx = r + (gx - range) * pxPerUnit;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, size);
        ctx.stroke();
      }
      for (let gz = oz; gz <= 2 * range; gz += grid) {
        const sy = r + (gz - range) * pxPerUnit;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(size, sy);
        ctx.stroke();
      }

      ctx.font = '9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      for (const m of markersRef.current) {
        const dx = (m.x - pos.x) * pxPerUnit;
        const dz = (m.z - pos.z) * pxPerUnit;
        const sx = r + dx;
        const sy = r + dz;
        const dist = Math.hypot(dx, dz);
        if (dist > r + 12) continue;

        if (m.kind === 'ship') {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = m.color;
          ctx.fillRect(-2.5, -2.5, 5, 5);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.fillStyle = m.color;
          ctx.globalAlpha = 0.92;
          ctx.arc(sx, sy, m.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          if (m.kind === 'boss') {
            ctx.strokeStyle = '#ff5252';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(sx, sy, m.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
          } else if (m.kind === 'dock' || m.kind === 'trading') {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, m.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (dist < r * 0.85 && (m.kind === 'island' || m.kind === 'boss' || m.kind === 'camp')) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            const tw = ctx.measureText(m.name).width;
            ctx.fillRect(sx - tw / 2 - 3, sy - m.radius - 13, tw + 6, 11);
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.fillText(m.name, sx, sy - m.radius - 4);
          }
        }
      }

      // Player arrow
      ctx.save();
      ctx.translate(r, r);
      ctx.rotate(yaw);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // North
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 10px system-ui';
      ctx.fillText('N', r, 14);

      ctx.restore();

      // Ring border
      ctx.beginPath();
      ctx.arc(r, r, r - 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251,191,36,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [engine, size, onWheel]);

  if (!engine) return null;

  return (
    <div
      className={`absolute ${POSITION_CLASS[position]} z-40 pointer-events-auto ${className}`}
      title="Zone minimap — scroll to zoom · islands · enemy ships · camps"
    >
      <button
        type="button"
        onClick={onExpand}
        className="relative rounded-full overflow-hidden border-2 border-amber-600/50 shadow-2xl shadow-black/60 bg-slate-950/90"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size, display: 'block' }}
        />
      </button>
      <div className="mt-1 text-[9px] text-slate-400 text-center font-mono space-y-0.5">
        <div>
          {coords.x}, {coords.z} · {zoomPct}%
        </div>
        <div className="text-amber-500/80">
          {islandCount} isles · {shipCount} ships
        </div>
      </div>
    </div>
  );
}
