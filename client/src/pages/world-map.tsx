import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Ship,
  Anchor,
  Compass,
  MapPin,
  Crosshair,
  Navigation,
  Home,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Globe
} from 'lucide-react';
import { getSectorAt } from '@shared/definitions/worldMapSectors';
import { buildOceanDeployUrl } from '@/lib/oceanNavigation';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import {
  WorldMapState,
  generateWorldMap,
  moveShip,
  dockAtIsland,
  undock,
  aimCannon,
  fireCannon,
  updateCannonballs,
  getTileColor,
  WORLD_MAP_DEFAULTS
} from '@/lib/worldMapSystem';
import { SectorImageryRenderer } from '@/lib/sectorImageryRenderer';
import { RACE_CITIES, raceCityPlayUrl, type RaceCity } from '@shared/definitions/raceCities';
import { THREE_HOME_ISLAND_PATH, THREE_OPEN_WORLD_PATH } from '@shared/fleet';
import CompleteWorldMap from '@/components/CompleteWorldMap';

type MapViewMode = 'complete' | 'tile';

export default function WorldMapPage() {
  const authReady = useAuthGuard();
  const [, navigate] = useLocation();

  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageryRef = useRef<SectorImageryRenderer | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  /** Default: complete 9-sector strategic render (SSOT). Tile = legacy sail canvas. */
  const [mapView, setMapView] = useState<MapViewMode>('complete');
  const [worldState, setWorldState] = useState<WorldMapState | null>(null);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.5);
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isAiming, setIsAiming] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  const selectedIsland = selectedIslandId
    ? worldState?.islands.find(i => i.id === selectedIslandId) || null
    : null;

  const worldSeed = worldState?.config.seed || WORLD_MAP_DEFAULTS.seed;

  const currentSector = worldState
    ? getSectorAt(worldState.playerShip.position.x, worldState.playerShip.position.y)
    : null;

  const enterZone = (sectorId: string, target: 'play' | 'zone' = 'play') => {
    navigate(buildOceanDeployUrl(sectorId, target, worldSeed));
  };

  const enterRaceCity = (city: RaceCity) => {
    navigate(raceCityPlayUrl(city, worldSeed));
  };

  // Handle window resize for canvas
  useEffect(() => {
    const onResize = () => setCanvasSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const savedSeed = localStorage.getItem('worldMapSeed');
    const seed = savedSeed || WORLD_MAP_DEFAULTS.seed;

    if (!savedSeed) {
      localStorage.setItem('worldMapSeed', seed);
    }

    const state = generateWorldMap({ ...WORLD_MAP_DEFAULTS, seed });
    setWorldState(state);

    setCameraOffset({
      x: state.playerShip.position.x * state.config.tileSize - 400,
      y: state.playerShip.position.y * state.config.tileSize - 300
    });

    // Initialize sector imagery renderer
    const imagery = new SectorImageryRenderer();
    imagery.preloadAll();
    imageryRef.current = imagery;

    return () => imagery.dispose();
  }, []);

  useEffect(() => {
    if (!worldState) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      const panSpeed = 20;
      
      switch (e.key.toLowerCase()) {
        case 'w':
          if (e.shiftKey) {
            setCameraOffset(p => ({ ...p, y: p.y - panSpeed }));
          } else {
            setWorldState(s => s ? moveShip(s, 'up') : s);
          }
          break;
        case 's':
          if (e.shiftKey) {
            setCameraOffset(p => ({ ...p, y: p.y + panSpeed }));
          } else {
            setWorldState(s => s ? moveShip(s, 'down') : s);
          }
          break;
        case 'a':
          if (e.shiftKey) {
            setCameraOffset(p => ({ ...p, x: p.x - panSpeed }));
          } else {
            setWorldState(s => s ? moveShip(s, 'left') : s);
          }
          break;
        case 'd':
          if (e.shiftKey) {
            setCameraOffset(p => ({ ...p, x: p.x + panSpeed }));
          } else {
            setWorldState(s => s ? moveShip(s, 'right') : s);
          }
          break;
        case 'arrowup':
          setCameraOffset(p => ({ ...p, y: p.y - panSpeed }));
          break;
        case 'arrowdown':
          setCameraOffset(p => ({ ...p, y: p.y + panSpeed }));
          break;
        case 'arrowleft':
          setCameraOffset(p => ({ ...p, x: p.x - panSpeed }));
          break;
        case 'arrowright':
          setCameraOffset(p => ({ ...p, x: p.x + panSpeed }));
          break;
        case ' ':
          e.preventDefault();
          if (isAiming) {
            setWorldState(s => s ? fireCannon(s) : s);
          }
          break;
        case 'f':
          setIsAiming(a => !a);
          break;
        case 'e':
          if (worldState.playerShip.isDocked) {
            setWorldState(s => s ? undock(s) : s);
            toast({ title: 'Undocked', description: 'Setting sail!' });
          } else {
            const nearbyIsland = worldState.islands.find(island => {
              const dist = Math.sqrt(
                (island.worldX - worldState.playerShip.position.x) ** 2 +
                (island.worldY - worldState.playerShip.position.y) ** 2
              );
              return dist <= 2 && island.discovered;
            });
            if (nearbyIsland) {
              setWorldState(s => s ? dockAtIsland(s, nearbyIsland.id) : s);
              setSelectedIslandId(nearbyIsland.id);
              toast({ title: 'Docked!', description: `Welcome to ${nearbyIsland.name}` });
            }
          }
          break;
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.1;
      const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
      setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
    };
    
    window.addEventListener('keydown', handleKeyDown);
    containerRef.current?.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      containerRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [worldState, isAiming, toast]);
  
  useEffect(() => {
    if (!worldState || worldState.cannonballs.length === 0) return;
    
    const interval = setInterval(() => {
      setWorldState(s => s ? updateCannonballs(s, 0.1) : s);
    }, 100);
    
    return () => clearInterval(interval);
  }, [worldState?.cannonballs.length]);
  
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!worldState || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left + cameraOffset.x) / (worldState.config.tileSize * zoom);
    const y = (e.clientY - rect.top + cameraOffset.y) / (worldState.config.tileSize * zoom);
    
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    
    if (tileX >= 0 && tileX < worldState.config.width && 
        tileY >= 0 && tileY < worldState.config.height) {
      const tile = worldState.tiles[tileY]?.[tileX];
      if (tile?.islandId) {
        const island = worldState.islands.find(i => i.id === tile.islandId);
        if (island && island.discovered) {
          setSelectedIslandId(island.id);
        }
      }
    }
  }, [worldState, cameraOffset, zoom]);
  
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!worldState || !isAiming || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const shipScreenX = worldState.playerShip.position.x * worldState.config.tileSize * zoom - cameraOffset.x;
    const shipScreenY = worldState.playerShip.position.y * worldState.config.tileSize * zoom - cameraOffset.y;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const angle = Math.atan2(mouseY - shipScreenY, mouseX - shipScreenX) * (180 / Math.PI);
    setWorldState(s => s ? aimCannon(s, angle) : s);
  }, [worldState, isAiming, cameraOffset, zoom]);
  
  // ── Main render loop with animation frame for FX ─────────────────────────
  const renderFrame = useCallback((timestamp: number) => {
    if (!worldState || !canvasRef.current) return;

    const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.1) : 0.016;
    lastTimeRef.current = timestamp;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { tiles, config, playerShip, islands, cannonballs } = worldState;
    const { tileSize } = config;
    const scaledTileSize = tileSize * zoom;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startTileX = Math.max(0, Math.floor(cameraOffset.x / scaledTileSize));
    const startTileY = Math.max(0, Math.floor(cameraOffset.y / scaledTileSize));
    const endTileX = Math.min(config.width, Math.ceil((cameraOffset.x + canvas.width) / scaledTileSize) + 1);
    const endTileY = Math.min(config.height, Math.ceil((cameraOffset.y + canvas.height) / scaledTileSize) + 1);

    // ── Draw tiles ──
    for (let y = startTileY; y < endTileY; y++) {
      for (let x = startTileX; x < endTileX; x++) {
        const tile = tiles[y]?.[x];
        if (!tile) continue;

        const screenX = x * scaledTileSize - cameraOffset.x;
        const screenY = y * scaledTileSize - cameraOffset.y;

        ctx.fillStyle = getTileColor(tile, tile.discovered);
        ctx.fillRect(screenX, screenY, scaledTileSize + 1, scaledTileSize + 1);

        if (tile.islandId && tile.discovered) {
          ctx.fillStyle = '#2d5a2d';
          ctx.beginPath();
          ctx.arc(screenX + scaledTileSize / 2, screenY + scaledTileSize / 2, scaledTileSize / 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── Sector imagery overlay (backgrounds, FX, labels, transitions) ──
    if (imageryRef.current) {
      imageryRef.current.render(
        ctx,
        playerShip.position.x,
        playerShip.position.y,
        cameraOffset.x,
        cameraOffset.y,
        scaledTileSize,
        canvas.width,
        canvas.height,
        dt,
      );
    }

    // ── Island names ──
    islands.forEach(island => {
      if (!island.discovered) return;

      const screenX = island.worldX * scaledTileSize - cameraOffset.x;
      const screenY = island.worldY * scaledTileSize - cameraOffset.y;

      ctx.fillStyle = '#fbbf24';
      ctx.font = `${10 * zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(island.name, screenX + scaledTileSize / 2, screenY - 5);
    });

    // ── Ship ──
    const shipScreenX = playerShip.position.x * scaledTileSize - cameraOffset.x + scaledTileSize / 2;
    const shipScreenY = playerShip.position.y * scaledTileSize - cameraOffset.y + scaledTileSize / 2;

    ctx.save();
    ctx.translate(shipScreenX, shipScreenY);

    let rotation = 0;
    switch (playerShip.direction) {
      case 'up': rotation = -Math.PI / 2; break;
      case 'down': rotation = Math.PI / 2; break;
      case 'left': rotation = Math.PI; break;
      case 'right': rotation = 0; break;
    }
    ctx.rotate(rotation);

    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.moveTo(scaledTileSize * 0.6, 0);
    ctx.lineTo(-scaledTileSize * 0.4, -scaledTileSize * 0.3);
    ctx.lineTo(-scaledTileSize * 0.4, scaledTileSize * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f5f5dc';
    ctx.beginPath();
    ctx.moveTo(0, -scaledTileSize * 0.5);
    ctx.lineTo(0, scaledTileSize * 0.1);
    ctx.lineTo(-scaledTileSize * 0.3, scaledTileSize * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // ── Cannon aiming ──
    if (isAiming) {
      const aimLength = playerShip.cannonPower * scaledTileSize;
      const aimEndX = shipScreenX + Math.cos(playerShip.cannonAngle * Math.PI / 180) * aimLength;
      const aimEndY = shipScreenY + Math.sin(playerShip.cannonAngle * Math.PI / 180) * aimLength;

      ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(shipScreenX, shipScreenY);
      ctx.lineTo(aimEndX, aimEndY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
      ctx.beginPath();
      ctx.arc(aimEndX, aimEndY, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Cannonballs ──
    cannonballs.forEach(ball => {
      const ballX = ball.position.x * scaledTileSize - cameraOffset.x;
      const ballY = ball.position.y * scaledTileSize - cameraOffset.y;

      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Request next frame for continuous FX animation
    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, [worldState, cameraOffset, zoom, isAiming]);

  // Start/stop animation loop
  useEffect(() => {
    if (!worldState) return;
    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [worldState, renderFrame]);

  const focusOnShip = () => {
    if (!worldState) return;
    const { playerShip, config } = worldState;
    const scaledTileSize = config.tileSize * zoom;
    setCameraOffset({
      x: playerShip.position.x * scaledTileSize - 400,
      y: playerShip.position.y * scaledTileSize - 300
    });
  };
  
  const discoveredIslands = worldState?.islands.filter(i => i.discovered) || [];
  const exploredCount = worldState?.islands.filter(i => i.explored).length || 0;

  // Auth + loading guards — AFTER all hooks
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-400 text-xl font-cinzel">Loading...</div>
      </div>
    );
  }

  // ── Complete 9-sector strategic map (default) ────────────────────────────
  if (mapView === 'complete') {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white">
        <CompleteWorldMap
          worldSeed={worldState?.config.seed || WORLD_MAP_DEFAULTS.seed}
          className="w-full h-full"
          fetchLive
        />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-2 pointer-events-auto">
          <Button
            size="sm"
            className="bg-amber-700/80 hover:bg-amber-600 font-cinzel"
            onClick={() => setMapView('tile')}
            data-testid="map-mode-tile"
          >
            <Compass className="w-4 h-4 mr-1" />
            Tile Sail Map
          </Button>
          <Link href="/ocean">
            <Button size="sm" variant="outline" className="border-cyan-700/50 text-cyan-200 bg-black/60">
              <Ship className="w-4 h-4 mr-1" />
              3D Ocean
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!worldState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-400 text-xl font-cinzel">Generating World Map...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden" ref={containerRef}>
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-amber-600/50 hover:bg-amber-950/40 text-amber-300"
          onClick={() => setMapView('complete')}
          data-testid="map-mode-complete"
        >
          <Globe className="w-4 h-4 mr-2" />
          Complete 9-Sector Map
        </Button>
        <Link href="/">
          <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-800" data-testid="back-home">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </Link>
        <Link href="/island">
          <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-800" data-testid="go-island">
            <MapPin className="w-4 h-4 mr-2" />
            Your Island
          </Button>
        </Link>
        <Link href="/ocean">
          <Button variant="outline" size="sm" className="border-cyan-700/50 hover:bg-cyan-950/40 text-cyan-300" data-testid="go-ocean">
            <Ship className="w-4 h-4 mr-2" />
            3D Ocean Sail
          </Button>
        </Link>
        <Link href="/sailing">
          <Button variant="outline" size="sm" className="border-amber-700/50 hover:bg-amber-950/40 text-amber-300" data-testid="go-rts-lobby">
            <Globe className="w-4 h-4 mr-2" />
            RTS Lobby
          </Button>
        </Link>
      </div>

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <Card className="bg-slate-900/90 border-amber-600/50 backdrop-blur-sm">
          <CardContent className="p-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-amber-400" />
              <span className="font-cinzel text-amber-300">{worldState.playerShip.name}</span>
            </div>
            <Separator orientation="vertical" className="h-6 bg-slate-600" />
            <div className="flex items-center gap-2 text-sm">
              <Compass className="w-4 h-4 text-sky-400" />
              <span className="text-slate-300">
                {worldState.playerShip.position.x}, {worldState.playerShip.position.y}
              </span>
            </div>
            <Separator orientation="vertical" className="h-6 bg-slate-600" />
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="w-4 h-4 text-green-400" />
              <span className="text-slate-300">{discoveredIslands.length} islands found</span>
            </div>
            {worldState.playerShip.isDocked && (
              <>
                <Separator orientation="vertical" className="h-6 bg-slate-600" />
                <Badge className="bg-green-600">
                  <Anchor className="w-3 h-3 mr-1" />
                  Docked
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="absolute inset-0 cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        data-testid="world-map-canvas"
      />

      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
        <Card className="bg-slate-900/90 border-slate-700 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="text-xs text-slate-400 mb-2 font-medium">Controls</div>
            <div className="grid grid-cols-3 gap-1 w-24 mb-2">
              <div />
              <Button 
                size="sm" 
                variant="outline" 
                className="w-8 h-8 p-0 border-slate-600"
                onClick={() => setWorldState(s => s ? moveShip(s, 'up') : s)}
                data-testid="move-up"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <div />
              <Button 
                size="sm" 
                variant="outline" 
                className="w-8 h-8 p-0 border-slate-600"
                onClick={() => setWorldState(s => s ? moveShip(s, 'left') : s)}
                data-testid="move-left"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-8 h-8 p-0 border-slate-600"
                onClick={focusOnShip}
                data-testid="focus-ship"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-8 h-8 p-0 border-slate-600"
                onClick={() => setWorldState(s => s ? moveShip(s, 'right') : s)}
                data-testid="move-right"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div />
              <Button 
                size="sm" 
                variant="outline" 
                className="w-8 h-8 p-0 border-slate-600"
                onClick={() => setWorldState(s => s ? moveShip(s, 'down') : s)}
                data-testid="move-down"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <div />
            </div>
            <div className="text-xs text-slate-500 space-y-0.5">
              <div><kbd className="bg-slate-700 px-1 rounded">WASD</kbd> Move ship</div>
              <div><kbd className="bg-slate-700 px-1 rounded">Shift+WASD</kbd> Pan camera</div>
              <div><kbd className="bg-slate-700 px-1 rounded">E</kbd> Dock/Undock</div>
              <div><kbd className="bg-slate-700 px-1 rounded">F</kbd> Toggle aim</div>
              <div><kbd className="bg-slate-700 px-1 rounded">Space</kbd> Fire cannon</div>
            </div>
          </CardContent>
        </Card>

        <Button
          variant={isAiming ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setIsAiming(a => !a)}
          className={isAiming ? '' : 'border-slate-600 hover:bg-slate-800'}
          data-testid="toggle-aim"
        >
          <Crosshair className="w-4 h-4 mr-2" />
          {isAiming ? 'Aiming...' : 'Aim Cannon'}
        </Button>

        {worldState.playerShip.isReloading && (
          <Badge variant="outline" className="border-orange-500 text-orange-400">
            Reloading... {worldState.playerShip.reloadTimeRemaining.toFixed(1)}s
          </Badge>
        )}
      </div>

      {currentSector && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
          <Card className="bg-slate-900/95 border-purple-600/50 backdrop-blur-sm">
            <CardContent className="p-3 flex items-center gap-4">
              <div>
                <div className="text-xs text-purple-400 uppercase tracking-widest">Current Sector</div>
                <div className="font-cinzel text-purple-200 font-semibold">{currentSector.name}</div>
                <div className="text-xs text-slate-400">
                  Lv {currentSector.difficultyMin}–{currentSector.difficultyMax} · {currentSector.biome}
                </div>
              </div>
              <Button
                size="sm"
                className="bg-purple-700 hover:bg-purple-600"
                onClick={() => enterZone(currentSector.id, 'play')}
                data-testid="enter-pvp-sector"
              >
                <Globe className="w-4 h-4 mr-2" />
                Enter PvP Sector
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-700/50 text-emerald-300"
                onClick={() => enterZone(currentSector.id, 'zone')}
                data-testid="enter-3d-zone"
              >
                Explore Solo
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Play-race capitals — Haven Port is Crusade (human + barbarian). Ashen Throne is NPC tribe. */}
      <div className="absolute top-20 left-4 z-20 w-80 max-h-[70vh]">
        <Card className="bg-slate-900/95 border-amber-700/40 backdrop-blur-sm">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-cinzel text-amber-400 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Race Capitals
            </CardTitle>
            <p className="text-[10px] text-slate-400 mt-1">
              Play races only (human + barbarian share Haven Port). Demon tribe is not listed.
            </p>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScrollArea className="h-[min(420px,50vh)]">
              <div className="space-y-2 pr-2">
                {RACE_CITIES.map((city) => (
                  <div
                    key={city.id}
                    className="p-2.5 rounded border border-slate-700 hover:border-amber-600/50 hover:bg-amber-950/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-cinzel text-sm text-amber-200">{city.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">{city.subtitle}</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-violet-600/50 text-violet-300 shrink-0">
                        {city.raceId}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{city.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <Badge variant="outline" className="text-[9px] border-red-800/50 text-red-300">
                        {city.dungeon.name}
                      </Badge>
                      {city.harvest.slice(0, 3).map((h) => (
                        <Badge key={h} variant="outline" className="text-[9px] border-emerald-800/40 text-emerald-400">
                          {h}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2 h-7 text-xs bg-amber-700 hover:bg-amber-600"
                      onClick={() => enterRaceCity(city)}
                      data-testid={`enter-race-city-${city.id}`}
                    >
                      Enter {city.name}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-[10px] border-slate-600"
                onClick={() => navigate(THREE_OPEN_WORLD_PATH)}
              >
                Haven Shore
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-[10px] border-slate-600"
                onClick={() => navigate(THREE_HOME_ISLAND_PATH)}
              >
                Home Island
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="absolute top-20 right-4 z-20 w-72">
        <Card className="bg-slate-900/90 border-slate-700 backdrop-blur-sm">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-cinzel text-amber-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Discovered Islands ({discoveredIslands.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScrollArea className="h-48">
              {discoveredIslands.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">
                  Sail to discover islands!
                </div>
              ) : (
                <div className="space-y-2">
                  {discoveredIslands.map(island => (
                    <div
                      key={island.id}
                      onClick={() => setSelectedIslandId(island.id)}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        selectedIsland?.id === island.id 
                          ? 'border-amber-500 bg-amber-900/30' 
                          : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
                      }`}
                      data-testid={`island-${island.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{island.name}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            island.biome === 'tropical' ? 'border-green-500 text-green-400' :
                            island.biome === 'volcanic' ? 'border-red-500 text-red-400' :
                            island.biome === 'frozen' ? 'border-cyan-500 text-cyan-400' :
                            island.biome === 'desert' ? 'border-yellow-500 text-yellow-400' :
                            'border-slate-500 text-slate-400'
                          }`}
                        >
                          {island.biome}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>Size: {island.size}</span>
                        <span>•</span>
                        <span>Lvl {island.difficulty}</span>
                        {island.explored && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-[10px] border-green-600 text-green-400">
                              Explored
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {selectedIsland && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute bottom-4 right-4 z-20 w-80"
          >
            <Card className="bg-slate-900/95 border-amber-600/50 backdrop-blur-sm">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-cinzel text-amber-400">
                    {selectedIsland.name}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedIslandId(null)}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="border-slate-500">
                    {selectedIsland.size} island
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={
                      selectedIsland.biome === 'tropical' ? 'border-green-500 text-green-400' :
                      selectedIsland.biome === 'volcanic' ? 'border-red-500 text-red-400' :
                      selectedIsland.biome === 'frozen' ? 'border-cyan-500 text-cyan-400' :
                      selectedIsland.biome === 'desert' ? 'border-yellow-500 text-yellow-400' :
                      'border-slate-500'
                    }
                  >
                    {selectedIsland.biome}
                  </Badge>
                  <Badge variant="outline" className="border-purple-500 text-purple-400">
                    Difficulty {selectedIsland.difficulty}
                  </Badge>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">Resources</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedIsland.resources.map((resource, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-slate-800">
                        {resource.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-slate-600"
                    onClick={() => {
                      const { worldX, worldY } = selectedIsland;
                      const scaledTileSize = worldState.config.tileSize * zoom;
                      setCameraOffset({
                        x: worldX * scaledTileSize - 400,
                        y: worldY * scaledTileSize - 300
                      });
                    }}
                    data-testid="focus-island"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Focus
                  </Button>
                  {!worldState.playerShip.isDocked && (
                    <Button
                      size="sm"
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                      onClick={() => {
                        const dist = Math.sqrt(
                          (selectedIsland.worldX - worldState.playerShip.position.x) ** 2 +
                          (selectedIsland.worldY - worldState.playerShip.position.y) ** 2
                        );
                        if (dist <= 2) {
                          setWorldState(s => s ? dockAtIsland(s, selectedIsland.id) : s);
                          toast({ title: 'Docked!', description: `Welcome to ${selectedIsland.name}` });
                        } else {
                          toast({ 
                            title: 'Too far!', 
                            description: 'Sail closer to dock.',
                            variant: 'destructive'
                          });
                        }
                      }}
                      data-testid="dock-island"
                    >
                      <Anchor className="w-3 h-3 mr-1" />
                      Dock
                    </Button>
                  )}
                </div>

                {selectedIsland.explored && currentSector && (
                  <Button
                    size="sm"
                    className="w-full bg-purple-700 hover:bg-purple-600"
                    onClick={() => enterZone(currentSector.id)}
                    data-testid="explore-island-3d"
                  >
                    <Globe className="w-3 h-3 mr-1" />
                    Enter 3D Zone
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {showMinimap && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <Card className="bg-slate-900/90 border-slate-700 backdrop-blur-sm overflow-hidden">
            <canvas
              width={150}
              height={150}
              className="block"
              ref={(minimapCanvas) => {
                if (!minimapCanvas || !worldState) return;
                const ctx = minimapCanvas.getContext('2d');
                if (!ctx) return;
                
                const { tiles, config, playerShip, islands } = worldState;
                const scale = 150 / Math.max(config.width, config.height);
                
                ctx.fillStyle = '#0a0a1a';
                ctx.fillRect(0, 0, 150, 150);
                
                for (let y = 0; y < config.height; y++) {
                  for (let x = 0; x < config.width; x++) {
                    const tile = tiles[y]?.[x];
                    if (!tile || !tile.discovered) continue;
                    
                    ctx.fillStyle = tile.type === 'island' ? '#2d5a2d' : 
                                   tile.type === 'shallow_water' ? '#1e5a8a' : '#0d3050';
                    ctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
                  }
                }
                
                islands.forEach(island => {
                  if (!island.discovered) return;
                  ctx.fillStyle = '#fbbf24';
                  ctx.beginPath();
                  ctx.arc(island.worldX * scale, island.worldY * scale, 2, 0, Math.PI * 2);
                  ctx.fill();
                });
                
                ctx.fillStyle = '#ff4444';
                ctx.beginPath();
                ctx.arc(playerShip.position.x * scale, playerShip.position.y * scale, 3, 0, Math.PI * 2);
                ctx.fill();
              }}
              data-testid="minimap"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
