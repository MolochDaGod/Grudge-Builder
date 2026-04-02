import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/assetConfig";

export interface CombatBackground {
  id: string;
  name: string;
  path: string;
}

export const COMBAT_BACKGROUNDS: CombatBackground[] = [
  { id: "fields", name: "Open Fields", path: assetUrl("/backgrounds/verdant_plains.png") },
  { id: "market", name: "Town Market", path: assetUrl("/backgrounds/tavern_bg.png") },
  { id: "settlement", name: "Settlement Gates", path: assetUrl("/backgrounds/castle_arena.jpg") },
  { id: "coast", name: "Island Coast", path: assetUrl("/backgrounds/ocean_battle.png") },
  { id: "dungeon", name: "Shadow Depths", path: assetUrl("/backgrounds/purple_dungeon.png") },
  { id: "lava", name: "Volcanic Field", path: assetUrl("/backgrounds/volcanic_battle.png") },
  { id: "frozen", name: "Frozen Wastes", path: assetUrl("/backgrounds/frozen_battle.png") },
  { id: "arena", name: "Arena", path: assetUrl("/backgrounds/arena_battle.png") },
];

export interface GridPosition {
  row: number;
  col: number;
}

export interface CombatUnit {
  id: string;
  name: string;
  spriteSheet: string;
  position: GridPosition;
  isHero: boolean;
  currentAnimation: string;
  hp: number;
  maxHp: number;
  isGuarding: boolean;
  isTaunting: boolean;
}

interface CombatArenaProps {
  initialBackground?: CombatBackground;
  heroes: CombatUnit[];
  enemies: CombatUnit[];
  gridRows?: number;
  gridCols?: number;
  onUnitClick?: (unit: CombatUnit) => void;
  onPositionClick?: (pos: GridPosition, isHeroSide: boolean) => void;
  onUnitGuard?: (unitId: string) => void;
  onUnitTaunt?: (unitId: string) => void;
  onUnitMove?: (unitId: string, newPos: GridPosition) => void;
  showGrid?: boolean;
}

interface SpritePosition {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  bobOffset: number;
  bobPhase: number;
}

export function calculatePath(
  start: GridPosition,
  end: GridPosition,
  obstacles: GridPosition[]
): GridPosition[] {
  const path: GridPosition[] = [];
  let current = { ...start };
  
  const dx = Math.sign(end.col - start.col);
  const dy = Math.sign(end.row - start.row);
  
  while (current.col !== end.col || current.row !== end.row) {
    const nextCol = current.col !== end.col ? current.col + dx : current.col;
    const nextRow = current.row !== end.row ? current.row + dy : current.row;
    
    const isBlocked = obstacles.some(
      (o) => o.row === nextRow && o.col === nextCol
    );
    
    if (!isBlocked) {
      current = { row: nextRow, col: nextCol };
      path.push({ ...current });
    } else {
      break;
    }
  }
  
  return path;
}

export function CombatArena({
  initialBackground = COMBAT_BACKGROUNDS[0],
  heroes,
  enemies,
  gridRows = 3,
  gridCols = 4,
  onUnitClick,
  onPositionClick,
  onUnitGuard,
  onUnitTaunt,
  onUnitMove,
  showGrid = false,
}: CombatArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedBackground, setSelectedBackground] = useState<CombatBackground>(initialBackground);
  const positionsRef = useRef<Map<string, SpritePosition>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const gridCellWidth = useMemo(() => 100 / (gridCols * 2), [gridCols]);
  const gridCellHeight = useMemo(() => 100 / gridRows, [gridRows]);

  const gridToPixel = useCallback((pos: GridPosition, isHero: boolean): { x: number; y: number } => {
    const baseX = isHero ? 5 : 55;
    const x = baseX + pos.col * gridCellWidth + gridCellWidth / 2;
    const y = 20 + pos.row * gridCellHeight + gridCellHeight / 2;
    return { x, y };
  }, [gridCellWidth, gridCellHeight]);

  useEffect(() => {
    [...heroes, ...enemies].forEach((unit) => {
      const target = gridToPixel(unit.position, unit.isHero);
      const existing = positionsRef.current.get(unit.id);
      
      if (existing) {
        existing.targetX = target.x;
        existing.targetY = target.y;
      } else {
        positionsRef.current.set(unit.id, {
          x: target.x,
          y: target.y,
          targetX: target.x,
          targetY: target.y,
          bobOffset: 0,
          bobPhase: Math.random() * Math.PI * 2,
        });
      }
    });
    
    const currentIds = new Set([...heroes, ...enemies].map(u => u.id));
    for (const id of Array.from(positionsRef.current.keys())) {
      if (!currentIds.has(id)) {
        positionsRef.current.delete(id);
      }
    }
  }, [heroes, enemies, gridToPixel]);

  useEffect(() => {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    loadImage(selectedBackground.path).then((img) => {
      bgImageRef.current = img;
    }).catch(console.error);
  }, [selectedBackground]);

  useEffect(() => {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    [...heroes, ...enemies].forEach((unit) => {
      if (!spriteImagesRef.current.has(unit.spriteSheet)) {
        loadImage(unit.spriteSheet).then((img) => {
          spriteImagesRef.current.set(unit.spriteSheet, img);
        }).catch(console.error);
      }
    });
  }, [heroes, enemies]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();
    const BOB_SPEED = 0.003;
    const BOB_AMPLITUDE = 3;
    const MOVE_SPEED = 0.08;

    const animate = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (showGrid) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        
        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            const heroX = (5 + col * gridCellWidth) * canvas.width / 100;
            const heroY = (20 + row * gridCellHeight) * canvas.height / 100;
            const cellW = gridCellWidth * canvas.width / 100;
            const cellH = gridCellHeight * canvas.height / 100;
            ctx.strokeRect(heroX, heroY, cellW, cellH);

            const enemyX = (55 + col * gridCellWidth) * canvas.width / 100;
            ctx.strokeRect(enemyX, heroY, cellW, cellH);
          }
        }
      }

      positionsRef.current.forEach((pos) => {
        pos.bobPhase += BOB_SPEED * deltaTime;
        pos.bobOffset = Math.sin(pos.bobPhase) * BOB_AMPLITUDE;
        
        const dx = pos.targetX - pos.x;
        const dy = pos.targetY - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.5) {
          pos.x += dx * MOVE_SPEED;
          pos.y += dy * MOVE_SPEED;
        } else {
          pos.x = pos.targetX;
          pos.y = pos.targetY;
        }
      });

      const allUnits = [...heroes, ...enemies];
      const sortedUnits = [...allUnits].sort((a, b) => {
        const posA = positionsRef.current.get(a.id);
        const posB = positionsRef.current.get(b.id);
        return (posA?.y || 0) - (posB?.y || 0);
      });

      sortedUnits.forEach((unit) => {
        const pos = positionsRef.current.get(unit.id);
        if (!pos) return;

        const spriteImg = spriteImagesRef.current.get(unit.spriteSheet);
        const x = (pos.x * canvas.width) / 100;
        const y = ((pos.y + pos.bobOffset) * canvas.height) / 100;

        if (spriteImg) {
          const frameWidth = 100;
          const frameHeight = 130;
          const scale = 1.2;
          const drawWidth = frameWidth * scale;
          const drawHeight = frameHeight * scale;

          ctx.save();
          
          if (!unit.isHero) {
            ctx.translate(x + drawWidth / 2, y);
            ctx.scale(-1, 1);
            ctx.translate(-drawWidth / 2, 0);
          } else {
            ctx.translate(x - drawWidth / 2, y - drawHeight / 2);
          }

          ctx.drawImage(
            spriteImg,
            0, 0, frameWidth, frameHeight,
            0, 0, drawWidth, drawHeight
          );

          ctx.restore();
        } else {
          ctx.fillStyle = unit.isHero ? "#4ade80" : "#f87171";
          ctx.beginPath();
          ctx.arc(x, y, 20, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = "white";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.fillText(unit.name.substring(0, 4), x, y + 4);
        }

        if (unit.isGuarding) {
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, 35, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.fillStyle = "#3b82f6";
          ctx.font = "bold 12px Arial";
          ctx.textAlign = "center";
          ctx.fillText("🛡️", x, y - 45);
        }

        if (unit.isTaunting) {
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 16px Arial";
          ctx.textAlign = "center";
          ctx.fillText("!", x, y - 50);
          
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(x, y, 40, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (selectedUnit === unit.id) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 45, 0, Math.PI * 2);
          ctx.stroke();
        }

        const hpBarWidth = 50;
        const hpBarHeight = 6;
        const hpX = x - hpBarWidth / 2;
        const hpY = y - 55;
        const hpPercent = unit.hp / unit.maxHp;

        ctx.fillStyle = "#1f2937";
        ctx.fillRect(hpX, hpY, hpBarWidth, hpBarHeight);

        ctx.fillStyle = hpPercent > 0.5 ? "#22c55e" : hpPercent > 0.25 ? "#eab308" : "#ef4444";
        ctx.fillRect(hpX, hpY, hpBarWidth * hpPercent, hpBarHeight);

        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 1;
        ctx.strokeRect(hpX, hpY, hpBarWidth, hpBarHeight);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [heroes, enemies, showGrid, gridRows, gridCellWidth, gridCellHeight, selectedUnit]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const allUnits = [...heroes, ...enemies];
    for (const unit of allUnits) {
      const pos = positionsRef.current.get(unit.id);
      if (!pos) continue;

      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance < 5) {
        setSelectedUnit(unit.id);
        onUnitClick?.(unit);
        return;
      }
    }

    const isHeroSide = x < 50;
    const col = isHeroSide
      ? Math.floor((x - 5) / gridCellWidth)
      : Math.floor((x - 55) / gridCellWidth);
    const row = Math.floor((y - 20) / gridCellHeight);

    if (col >= 0 && col < gridCols && row >= 0 && row < gridRows) {
      if (selectedUnit && onUnitMove) {
        onUnitMove(selectedUnit, { row, col });
      }
      onPositionClick?.({ row, col }, isHeroSide);
    }
  }, [heroes, enemies, gridCellWidth, gridCellHeight, gridCols, gridRows, onUnitClick, onPositionClick, onUnitMove, selectedUnit]);

  const handleGuard = useCallback(() => {
    if (selectedUnit) {
      onUnitGuard?.(selectedUnit);
    }
  }, [selectedUnit, onUnitGuard]);

  const handleTaunt = useCallback(() => {
    if (selectedUnit) {
      onUnitTaunt?.(selectedUnit);
    }
  }, [selectedUnit, onUnitTaunt]);

  const handleBackgroundChange = useCallback((bg: CombatBackground) => {
    setSelectedBackground(bg);
  }, []);

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        data-testid="combat-arena-canvas"
      />
      
      <div className="absolute top-2 left-2 flex gap-2">
        {COMBAT_BACKGROUNDS.map((bg) => (
          <button
            key={bg.id}
            onClick={() => handleBackgroundChange(bg)}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              bg.id === selectedBackground.id
                ? "bg-amber-600 text-white"
                : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
            )}
            data-testid={`bg-select-${bg.id}`}
          >
            {bg.name}
          </button>
        ))}
      </div>

      {selectedUnit && (
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={handleGuard}
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
            data-testid="action-guard"
          >
            🛡️ Guard
          </button>
          <button
            onClick={handleTaunt}
            className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
            data-testid="action-taunt"
          >
            ⚔️ Taunt
          </button>
        </div>
      )}

      <div className="absolute bottom-2 left-2 text-xs text-white/60">
        Heroes: {heroes.length} | Enemies: {enemies.length}
        {selectedUnit && ` | Selected: ${selectedUnit}`}
      </div>
    </div>
  );
}

export default CombatArena;
