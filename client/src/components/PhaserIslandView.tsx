import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig, IslandScene, IslandConfig } from '@/lib/phaserIslandScene';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Grid3X3, RotateCcw, Home, Building, Castle, TreePine, Store } from 'lucide-react';

interface PhaserIslandViewProps {
  seed?: string;
  onBuildingPlaced?: (building: { id: string; type: string; gridX: number; gridY: number }) => void;
  className?: string;
}

export function PhaserIslandView({ seed, onBuildingPlaced, className }: PhaserIslandViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<IslandScene | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const containerId = 'phaser-island-container';
    containerRef.current.id = containerId;

    const config: Partial<IslandConfig> = {
      width: 100,
      height: 100,
      gridSize: 32,
      seed: seed || crypto.randomUUID(),
      buildableZone: {
        minX: 45,
        maxX: 55,
        minY: 45,
        maxY: 55,
      },
    };

    const phaserConfig = createPhaserConfig(containerId, config);
    
    const game = new Phaser.Game({
      ...phaserConfig,
      callbacks: {
        postBoot: (bootedGame) => {
          const scene = bootedGame.scene.getScene('IslandScene') as IslandScene;
          if (scene) {
            sceneRef.current = scene;
            scene.setConfig(config);
            setIsReady(true);
          }
        },
      },
    });

    gameRef.current = game;

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
        setIsReady(false);
      }
    };
  }, [seed]);

  const handleSelectBuilding = (type: string) => {
    setSelectedBuilding(type === selectedBuilding ? null : type);
    if (sceneRef.current) {
      if (type === selectedBuilding) {
        sceneRef.current.selectBuildingType('');
      } else {
        sceneRef.current.selectBuildingType(type);
      }
    }
  };

  const handleToggleGrid = () => {
    setShowGrid(!showGrid);
    sceneRef.current?.toggleGridOverlay();
  };

  const handleResetCamera = () => {
    sceneRef.current?.resetCamera();
  };

  const handleClearBuildings = () => {
    sceneRef.current?.clearAllBuildings();
  };

  const buildingTypes = [
    { id: 'house', label: 'House', icon: Home, color: 'bg-blue-600', key: '1' },
    { id: 'tower', label: 'Tower', icon: Castle, color: 'bg-red-600', key: '2' },
    { id: 'farm', label: 'Farm', icon: TreePine, color: 'bg-yellow-600', key: '3' },
    { id: 'market', label: 'Market', icon: Store, color: 'bg-orange-600', key: '4' },
  ];

  return (
    <div className={cn("relative w-full h-full flex flex-col", className)}>
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700">
        <Button
          size="sm"
          variant={showGrid ? "default" : "ghost"}
          className="h-8 px-2"
          onClick={handleToggleGrid}
          data-testid="btn-toggle-grid"
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={handleResetCamera}
          data-testid="btn-reset-camera"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-slate-700 mx-1" />
        
        {buildingTypes.map((building) => (
          <Button
            key={building.id}
            size="sm"
            variant={selectedBuilding === building.id ? "default" : "ghost"}
            className={cn(
              "h-8 px-2 gap-1",
              selectedBuilding === building.id && building.color
            )}
            onClick={() => handleSelectBuilding(building.id)}
            data-testid={`btn-build-${building.id}`}
          >
            <building.icon className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">{building.label}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-600">
              {building.key}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700 text-xs font-mono">
        <div className="text-amber-400 font-bold">BUILD AREA 10x10</div>
        <div className="text-slate-400">WASD/Arrows = Pan</div>
        <div className="text-slate-400">Wheel = Zoom</div>
        <div className="text-slate-400">Right Drag = Pan</div>
        <div className="text-slate-400">1-4 = Buildings</div>
        <div className="text-slate-400">G = Grid | R = Reset</div>
      </div>

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-30">
          <div className="text-amber-400 animate-pulse">Loading Island...</div>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 w-full h-full min-h-[400px] focus:outline-none"
        tabIndex={-1}
        style={{ cursor: selectedBuilding ? 'crosshair' : 'grab' }}
        data-testid="phaser-island-canvas"
      />

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#90EE90]" />
            <span className="text-slate-300">Buildable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#5fa354]" />
            <span className="text-slate-300">Grass</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#2d5016]" />
            <span className="text-slate-300">Forest</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#c2b280]" />
            <span className="text-slate-300">Beach</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#1a4d7a]" />
            <span className="text-slate-300">Water</span>
          </div>
        </div>
      </div>
    </div>
  );
}
