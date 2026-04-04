import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Swords, Shield, Skull, Sparkles, Waves, ZoomIn, ZoomOut, Locate, Info } from "lucide-react";
import type { WorldZone, PlayerBlock, ZoneType } from "@shared/definitions/worldMap";
import { WORLD_CONFIG, isZoneExpired } from "@shared/definitions/worldMap";

// ── Zone visual config ────────────────────────────────────────────────────────

const ZONE_COLORS: Record<ZoneType, { bg: string; border: string; label: string; icon: typeof Home }> = {
  home:  { bg: 'bg-amber-500',   border: 'border-amber-400', label: 'Home',  icon: Home },
  wild:  { bg: 'bg-green-600',   border: 'border-green-400', label: 'Wild',  icon: Swords },
  fort:  { bg: 'bg-purple-600',  border: 'border-purple-400', label: 'Fort', icon: Shield },
  boss:  { bg: 'bg-red-600',     border: 'border-red-400',   label: 'Boss',  icon: Skull },
  event: { bg: 'bg-cyan-500',    border: 'border-cyan-300',  label: 'Event', icon: Sparkles },
  empty: { bg: 'bg-blue-900/40', border: 'border-blue-800',  label: 'Ocean', icon: Waves },
};

const DIFFICULTY_COLORS = [
  '', 'text-gray-400', 'text-gray-300', 'text-green-400', 'text-green-300',
  'text-yellow-400', 'text-yellow-300', 'text-orange-400', 'text-orange-300',
  'text-red-400', 'text-red-300',
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface WorldMapViewProps {
  playerBlock: PlayerBlock | null;
  /** Called when user clicks a zone to navigate into it */
  onZoneSelect?: (zone: WorldZone) => void;
  /** Currently selected/active zone */
  activeZone?: WorldZone | null;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorldMapView({ playerBlock, onZoneSelect, activeZone, className }: WorldMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(8); // pixels per zone cell
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [hoveredZone, setHoveredZone] = useState<WorldZone | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Center on player block when it loads
  useEffect(() => {
    if (playerBlock && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerZoneX = playerBlock.originX + 1;
      const centerZoneY = playerBlock.originY + 1;
      setPanOffset({
        x: rect.width / 2 - centerZoneX * zoom,
        y: rect.height / 2 - centerZoneY * zoom,
      });
    }
  }, [playerBlock, zoom]);

  // Build zone lookup from player block
  const zoneMap = useMemo(() => {
    const map = new Map<string, WorldZone>();
    if (!playerBlock) return map;
    for (const zone of playerBlock.zones) {
      map.set(`${zone.zoneX},${zone.zoneY}`, zone);
    }
    return map;
  }, [playerBlock]);

  // Determine if a cell is in the player's 3×3 block
  const isInPlayerBlock = useCallback(
    (x: number, y: number) => {
      if (!playerBlock) return false;
      return (
        x >= playerBlock.originX &&
        x < playerBlock.originX + 3 &&
        y >= playerBlock.originY &&
        y < playerBlock.originY + 3
      );
    },
    [playerBlock],
  );

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: panOffset.x, panY: panOffset.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    setPanOffset({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  // Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(4, Math.min(24, z + (e.deltaY > 0 ? -1 : 1))));
  };

  const centerOnHome = () => {
    if (!playerBlock || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPanOffset({
      x: rect.width / 2 - (playerBlock.originX + 1) * zoom,
      y: rect.height / 2 - (playerBlock.originY + 1) * zoom,
    });
  };

  // Render the visible portion of the grid
  const visibleCells = useMemo(() => {
    if (!containerRef.current) return [];
    const rect = containerRef.current.getBoundingClientRect?.() || { width: 800, height: 600 };
    const startX = Math.max(0, Math.floor(-panOffset.x / zoom) - 1);
    const startY = Math.max(0, Math.floor(-panOffset.y / zoom) - 1);
    const endX = Math.min(WORLD_CONFIG.worldWidth, startX + Math.ceil(rect.width / zoom) + 2);
    const endY = Math.min(WORLD_CONFIG.worldHeight, startY + Math.ceil(rect.height / zoom) + 2);

    const cells: { x: number; y: number; zone: WorldZone | null; inBlock: boolean }[] = [];
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        cells.push({
          x,
          y,
          zone: zoneMap.get(`${x},${y}`) || null,
          inBlock: isInPlayerBlock(x, y),
        });
      }
    }
    return cells;
  }, [panOffset, zoom, zoneMap, isInPlayerBlock]);

  return (
    <div className={cn("relative overflow-hidden bg-blue-950 rounded-xl border border-slate-800", className)}>
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <Button size="icon" variant="outline" className="h-8 w-8 bg-black/60" onClick={() => setZoom((z) => Math.min(24, z + 2))}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-black/60" onClick={() => setZoom((z) => Math.max(4, z - 2))}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-black/60" onClick={centerOnHome}>
          <Locate className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1">
        {Object.entries(ZONE_COLORS).map(([type, cfg]) => (
          <Badge key={type} variant="outline" className={cn("text-[10px] border-slate-600", cfg.bg, "text-white")}>
            {cfg.label}
          </Badge>
        ))}
      </div>

      {/* Hovered zone info */}
      {hoveredZone && (
        <div className="absolute bottom-3 left-3 z-20 bg-black/80 border border-slate-700 rounded-lg p-3 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            {(() => { const Icon = ZONE_COLORS[hoveredZone.type].icon; return <Icon className="w-4 h-4" />; })()}
            <span className="font-bold text-white text-sm">{ZONE_COLORS[hoveredZone.type].label} Zone</span>
            <span className="text-slate-500 text-xs">({hoveredZone.zoneX}, {hoveredZone.zoneY})</span>
          </div>
          {hoveredZone.difficulty && (
            <div className={cn("text-xs", DIFFICULTY_COLORS[hoveredZone.difficulty])}>
              Difficulty: {hoveredZone.difficulty}/10
            </div>
          )}
          {hoveredZone.lootTheme && (
            <div className="text-xs text-slate-400">Theme: {hoveredZone.lootTheme}</div>
          )}
          {hoveredZone.ownerId && hoveredZone.type !== 'home' && (
            <div className="text-xs text-amber-400">Captured</div>
          )}
          {hoveredZone.expiresAt && !isZoneExpired(hoveredZone) && (
            <div className="text-xs text-slate-500">
              Expires: {new Date(hoveredZone.expiresAt).toLocaleTimeString()}
            </div>
          )}
          {isZoneExpired(hoveredZone) && (
            <div className="text-xs text-red-400">Expired — will rotate</div>
          )}
        </div>
      )}

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="w-full h-[500px] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            width: WORLD_CONFIG.worldWidth * zoom,
            height: WORLD_CONFIG.worldHeight * zoom,
          }}
        >
          {visibleCells.map(({ x, y, zone, inBlock }) => {
            const zoneType: ZoneType = zone?.type || 'empty';
            const cfg = ZONE_COLORS[zoneType];
            const isActive =
              activeZone && activeZone.zoneX === x && activeZone.zoneY === y;
            const isHovered =
              hoveredZone && hoveredZone.zoneX === x && hoveredZone.zoneY === y;

            return (
              <div
                key={`${x},${y}`}
                className={cn(
                  "absolute border transition-all duration-100",
                  cfg.bg,
                  inBlock ? "border-amber-500/60" : cfg.border,
                  inBlock ? "opacity-100" : "opacity-60",
                  isActive && "ring-2 ring-white",
                  isHovered && "brightness-125",
                  zone && zone.type !== 'empty' && "cursor-pointer hover:brightness-125",
                )}
                style={{
                  left: x * zoom,
                  top: y * zoom,
                  width: zoom,
                  height: zoom,
                }}
                onMouseEnter={() => zone && setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                onClick={(e) => {
                  if (!isDragging && zone && zone.type !== 'empty' && onZoneSelect) {
                    e.stopPropagation();
                    onZoneSelect(zone);
                  }
                }}
              >
                {/* Home indicator */}
                {zone?.type === 'home' && zoom >= 10 && (
                  <Home className="w-full h-full p-[1px] text-amber-300" />
                )}
                {/* Boss skull */}
                {zone?.type === 'boss' && zoom >= 10 && (
                  <Skull className="w-full h-full p-[1px] text-red-300" />
                )}
              </div>
            );
          })}

          {/* Player block outline */}
          {playerBlock && (
            <div
              className="absolute border-2 border-amber-400 rounded-sm pointer-events-none z-10"
              style={{
                left: playerBlock.originX * zoom - 1,
                top: playerBlock.originY * zoom - 1,
                width: 3 * zoom + 2,
                height: 3 * zoom + 2,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
