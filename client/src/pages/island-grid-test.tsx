import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { IslandTileRenderer } from '@/components/IslandTileRenderer';
import { 
  generateIslandGrid, 
  IslandTileGrid, 
  IslandTile,
  GRID_CONFIG,
  clearLand,
  tileToWorld
} from '@/lib/islandTileGrid';
import { RefreshCw, Grid3X3, MapPin, Mountain, Waves, Trees, Home, ZoomIn, ZoomOut } from 'lucide-react';

export default function IslandGridTestPage() {
  const [grid, setGrid] = useState<IslandTileGrid | null>(null);
  const [camera, setCamera] = useState({ x: 3200, y: 3200, zoom: 0.15 }); // Center of 200x200 grid * 32px
  const [showGrid, setShowGrid] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<IslandTile | null>(null);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Generate initial island
  useEffect(() => {
    generateNewIsland();
  }, []);
  
  // Update viewport size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  const generateNewIsland = useCallback(() => {
    setIsGenerating(true);
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const newGrid = generateIslandGrid();
      setGrid(newGrid);
      // Center camera on camp
      const campWorld = tileToWorld(newGrid.campCenter.x, newGrid.campCenter.y);
      setCamera({ x: campWorld.x, y: campWorld.y, zoom: 0.5 });
      setIsGenerating(false);
    }, 100);
  }, []);
  
  const handleTileClick = useCallback((tile: IslandTile, worldX: number, worldY: number) => {
    setSelectedTile({ x: tile.x, y: tile.y });
    
    // Try to clear land at this position (2x2 area)
    if (grid && tile.type === 'grass' && !tile.isCleared) {
      const success = clearLand(grid, tile.x, tile.y);
      if (success) {
        setGrid({ ...grid }); // Trigger re-render
      }
    }
  }, [grid]);
  
  const handleTileHover = useCallback((tile: IslandTile | null) => {
    setHoveredTile(tile);
  }, []);
  
  // Mouse drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    setCamera(prev => ({
      ...prev,
      x: prev.x - dx / prev.zoom,
      y: prev.y - dy / prev.zoom,
    }));
  }, []);
  
  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);
  
  // Zoom controls
  const handleZoom = useCallback((delta: number) => {
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(2, prev.zoom + delta)),
    }));
  }, []);
  
  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    handleZoom(delta);
  }, [handleZoom]);
  
  // Count tile types
  const tileStats = grid ? {
    water: 0,
    shore: 0,
    grass: 0,
    hill: 0,
    mountain: 0,
    cleared: 0,
    camp: 0,
  } : null;
  
  if (grid && tileStats) {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const type = grid.tiles[y][x].type;
        if (type === 'deep_water' || type === 'shallow_water') {
          tileStats.water++;
        } else if (type in tileStats) {
          (tileStats as any)[type]++;
        }
      }
    }
  }
  
  return (
    <Layout>
      <div className="flex h-full">
        {/* Main viewport */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-slate-900 overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {grid ? (
            <IslandTileRenderer
              grid={grid}
              camera={camera}
              viewportWidth={viewportSize.width}
              viewportHeight={viewportSize.height}
              showGrid={showGrid}
              onTileClick={handleTileClick}
              onTileHover={handleTileHover}
              selectedTile={selectedTile}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              {isGenerating ? 'Generating island...' : 'No island generated'}
            </div>
          )}
          
          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleZoom(-0.1)}
              className="bg-slate-800/80"
              data-testid="btn-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Badge variant="outline" className="bg-slate-800/80 px-3">
              {Math.round(camera.zoom * 100)}%
            </Badge>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleZoom(0.1)}
              className="bg-slate-800/80"
              data-testid="btn-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Tile info overlay */}
          {hoveredTile && (
            <div className="absolute top-4 left-4 bg-slate-800/90 rounded-lg p-3 text-sm">
              <div className="text-white font-medium">
                Tile ({hoveredTile.x}, {hoveredTile.y})
              </div>
              <div className="text-slate-300">Type: {hoveredTile.type}</div>
              <div className="text-slate-300">Height: {hoveredTile.height.toFixed(1)}</div>
              <div className="text-slate-300">Walkable: {hoveredTile.isWalkable ? 'Yes' : 'No'}</div>
              <div className="text-slate-300">Buildable: {hoveredTile.isBuildable ? 'Yes' : 'No'}</div>
              {hoveredTile.isCleared && <Badge className="mt-1 bg-green-600">Cleared</Badge>}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 space-y-4 overflow-y-auto">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                Island Grid Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={generateNewIsland}
                disabled={isGenerating}
                className="w-full"
                data-testid="btn-generate-island"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Generate New Island
              </Button>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="show-grid"
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                />
                <Label htmlFor="show-grid" className="text-slate-300">Show Grid Lines</Label>
              </div>
              
              {grid && (
                <div className="space-y-2 text-sm">
                  <div className="text-slate-400">Seed: {grid.seed}</div>
                  <div className="text-slate-400">
                    Size: {grid.width}x{grid.height} ({grid.width * grid.height} tiles)
                  </div>
                  <div className="text-slate-400">Land tiles: {grid.landTileCount}</div>
                  <div className="text-slate-400">
                    Camp: ({grid.campCenter.x}, {grid.campCenter.y})
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Tile Statistics */}
          {tileStats && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tile Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-blue-400">
                    <Waves className="w-4 h-4" /> Water
                  </span>
                  <span>{tileStats.water.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-yellow-400">
                    Shore
                  </span>
                  <span>{tileStats.shore.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-green-400">
                    <Trees className="w-4 h-4" /> Grass
                  </span>
                  <span>{tileStats.grass.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-lime-400">
                    Hill
                  </span>
                  <span>{tileStats.hill.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-stone-400">
                    <Mountain className="w-4 h-4" /> Mountain
                  </span>
                  <span>{tileStats.mountain.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-amber-400">
                    <Home className="w-4 h-4" /> Camp
                  </span>
                  <span>{tileStats.camp.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-lime-300">
                    <Grid3X3 className="w-4 h-4" /> Cleared
                  </span>
                  <span>{tileStats.cleared.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Instructions */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Controls</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-400 space-y-1">
              <p>• Drag to pan</p>
              <p>• Scroll to zoom</p>
              <p>• Click grass tiles to clear land (2x2)</p>
              <p>• Yellow area = starting camp</p>
            </CardContent>
          </Card>
          
          {/* Constraints Check */}
          {grid && (
            <Card className={`border ${
              grid.landTileCount >= GRID_CONFIG.minLandTiles && grid.landTileCount <= GRID_CONFIG.maxLandTiles
                ? 'bg-green-900/30 border-green-700'
                : 'bg-red-900/30 border-red-700'
            }`}>
              <CardContent className="pt-4 text-sm">
                <div className="font-medium mb-2">Constraints Check</div>
                <div className={grid.landTileCount >= GRID_CONFIG.minLandTiles ? 'text-green-400' : 'text-red-400'}>
                  Min land: {grid.landTileCount} ≥ {GRID_CONFIG.minLandTiles} {grid.landTileCount >= GRID_CONFIG.minLandTiles ? '✓' : '✗'}
                </div>
                <div className={grid.landTileCount <= GRID_CONFIG.maxLandTiles ? 'text-green-400' : 'text-red-400'}>
                  Max land: {grid.landTileCount} ≤ {GRID_CONFIG.maxLandTiles} {grid.landTileCount <= GRID_CONFIG.maxLandTiles ? '✓' : '✗'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
