/**
 * HUD minimap — top-down schematic of the ocean chart, not painted art.
 */
import { useEffect, useState } from "react";
import {
  ALL_ISLANDS,
  currentAlerts,
  factionClass,
  islandPhase,
  liveShips,
  matchesMapFilter,
} from "@shared/fleet/warlordsWorldMap";

const BLOB: Record<string, string> = {
  "bg-map-fabled": "#c9a227",
  "bg-map-crusade": "#3d8ec9",
  "bg-map-legion": "#c2453c",
  "bg-map-main": "#3caf5c",
  "bg-map-private": "#7d8794",
};

export function WarlordsMinimap({
  you = { x: 0.5, y: 0.5, yaw: 0 },
  onOpen,
}: {
  you?: { x: number; y: number; yaw?: number };
  onOpen: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const zoom = 1.7;
  const pan = { x: you.x - 0.5, y: you.y - 0.5 };
  const islands = ALL_ISLANDS.filter((i) => matchesMapFilter(i, "all", now));
  const ships = liveShips(now);
  const alert = currentAlerts(now)[0];
  const toPct = (x: number, y: number) => ({
    left: (0.5 + (x - 0.5 - pan.x) * zoom) * 100,
    top: (0.5 + (y - 0.5 - pan.y) * zoom) * 100,
  });

  return (
    <div className="pointer-events-auto absolute top-24 left-3 z-40 flex flex-col gap-1">
      <button
        type="button"
        onClick={onOpen}
        className="relative size-28 overflow-hidden rounded-full border border-white/15 shadow-lg sm:size-32"
        style={{
          backgroundColor: "#0a1628",
          backgroundImage:
            "linear-gradient(rgba(142,180,212,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(142,180,212,0.16) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
        aria-label="Minimap"
      >
        {islands.map((island) => {
          const phase = islandPhase(island, now);
          const pos = toPct(island.x, island.y);
          if (pos.left < -10 || pos.left > 110 || pos.top < -10 || pos.top > 110) return null;
          const dim = island.size * zoom * 100;
          const color = BLOB[factionClass(island.faction)] ?? "#7d8794";
          return (
            <span
              key={island.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                width: `${dim}%`,
                height: `${dim}%`,
                background: color,
                boxShadow: `0 0 8px ${color}`,
                opacity: phase === "sinking" ? 0.4 : 0.95,
              }}
            />
          );
        })}
        {ships.map((ship) => {
          const pos = toPct(ship.x, ship.y);
          if (pos.left < 0 || pos.left > 100) return null;
          return (
            <span
              key={ship.id}
              className="absolute size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-100"
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            />
          );
        })}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderBottom: "8px solid #3caf5c",
            transform: `translate(-50%, -50%) rotate(${(((you.yaw ?? 0) * 180) / Math.PI + 360) % 360}deg)`,
          }}
        />
      </button>
      {alert && (
        <p className="max-w-40 rounded border border-white/10 bg-black/70 px-2 py-1 text-[10px] leading-snug text-red-300">
          {alert.line}
        </p>
      )}
    </div>
  );
}

export default WarlordsMinimap;
