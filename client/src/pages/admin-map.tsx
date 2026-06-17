import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { CharacterManager, Character } from "@/lib/characterManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/assetConfig";
import { 
  CameraState, 
  worldToScreen, 
  screenToWorld, 
  panCamera, 
  zoomCamera, 
  createDefaultCamera,
  getBackgroundTransform 
} from "@/lib/islandCamera";
import { CharacterStateData, createCharacterState, STATE_DISPLAY_NAMES, STATE_COLORS, CharacterActivityState } from "@/lib/characterState";
import {
  ResourceNode,
  IslandState,
  loadIslandState,
  saveIslandState,
  generateIslandNodes,
  NODE_RARITY_CONFIG,
} from "@/lib/islandSystem";
import { 
  MapPin, 
  MousePointer, 
  Move, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff,
  Users,
  TreePine,
  Fish,
  Pickaxe,
  Leaf,
  Settings,
  Grid,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import { Link } from "wouter";

type EditMode = 'select' | 'move' | 'add_node' | 'add_hero';
type EntityType = 'node' | 'hero' | 'animal';

interface SelectedEntity {
  type: EntityType;
  id: string;
}

export default function AdminMapPage() {
  const [camera, setCamera] = useState<CameraState>(createDefaultCamera());
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [islandState, setIslandState] = useState<IslandState | null>(null);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [characterStates, setCharacterStates] = useState<Record<string, CharacterStateData>>({});
  
  const [editMode, setEditMode] = useState<EditMode>('select');
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showNodes, setShowNodes] = useState(true);
  const [showHeroes, setShowHeroes] = useState(true);
  
  const [newNodeType, setNewNodeType] = useState('Ore');
  const [newNodeRarity, setNewNodeRarity] = useState('common');
  
  // Track viewport size
  useEffect(() => {
    const updateViewportSize = () => {
      if (mapContainerRef.current) {
        setViewportSize({
          width: mapContainerRef.current.clientWidth,
          height: mapContainerRef.current.clientHeight,
        });
      }
    };
    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);
  
  // Load island and characters
  useEffect(() => {
    const loadData = async () => {
      const chars = await CharacterManager.getAll();
      setAllCharacters(chars);
      
      const state = await loadIslandState("guest");
      setIslandState(state);
      
      // Initialize character states
      const states: Record<string, CharacterStateData> = {};
      chars.slice(0, 5).forEach((char, i) => {
        const x = 45 + (i % 3) * 5;
        const y = 45 + Math.floor(i / 3) * 5;
        states[char.id] = createCharacterState(char.id, x, y);
      });
      setCharacterStates(states);
    };
    loadData();
  }, []);
  
  // Camera controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const panSpeed = 50;
      switch (e.key.toLowerCase()) {
        case 'w':
          setCamera(prev => panCamera(prev, 0, -panSpeed, viewportSize));
          break;
        case 's':
          setCamera(prev => panCamera(prev, 0, panSpeed, viewportSize));
          break;
        case 'a':
          setCamera(prev => panCamera(prev, -panSpeed, 0, viewportSize));
          break;
        case 'd':
          setCamera(prev => panCamera(prev, panSpeed, 0, viewportSize));
          break;
        case 'escape':
          setSelectedEntity(null);
          setEditMode('select');
          break;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (mapContainerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        const rect = mapContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
        setCamera(prev => zoomCamera(prev, zoomDelta, { x: mouseX, y: mouseY }, viewportSize));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [viewportSize]);
  
  // Handle map click
  const handleMapClick = (e: React.MouseEvent) => {
    if (!mapContainerRef.current) return;
    
    const rect = mapContainerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld({ x: screenX, y: screenY }, camera, viewportSize);
    
    if (editMode === 'add_node' && islandState) {
      const nodeTypeLower = newNodeType.toLowerCase();
      const getNodeType = (): ResourceNode['type'] => {
        if (nodeTypeLower === 'tree') return 'wood';
        if (nodeTypeLower === 'herb') return 'herb';
        if (nodeTypeLower === 'fish') return 'fish';
        return 'ore';
      };
      const newNode: ResourceNode = {
        id: `node_${Date.now()}`,
        name: newNodeType,
        type: getNodeType(),
        icon: getNodeIcon(newNodeType),
        x: worldPos.x,
        y: worldPos.y,
        tier: 1,
        color: '#888888',
        profession: getProfessionForNode(newNodeType),
        spawnedAt: Date.now(),
        expiresAt: Date.now() + 4 * 60 * 60 * 1000,
        uptime: 4,
        cooldownHours: 1,
        harvestIntervalMinutes: 10,
        isWaterNode: newNodeType === 'Fish',
        rarity: newNodeRarity as any,
        nodeLevel: 1,
        drops: [],
      };
      
      const updatedState = {
        ...islandState,
        nodes: [...islandState.nodes, newNode],
      };
      setIslandState(updatedState);
      saveIslandState(islandState.id, updatedState);
    }
  };
  
  const getNodeIcon = (type: string): string => {
    switch (type) {
      case 'Ore': return '⛏️';
      case 'Tree': return '🌲';
      case 'Herb': return '🌿';
      case 'Fish': return '🐟';
      default: return '📦';
    }
  };
  
  const getProfessionForNode = (type: string): string => {
    switch (type) {
      case 'Ore': return 'Mining';
      case 'Tree': return 'Logging';
      case 'Herb': return 'Herbalism';
      case 'Fish': return 'Fishing';
      default: return 'Gathering';
    }
  };
  
  const deleteSelectedEntity = () => {
    if (!selectedEntity || !islandState) return;
    
    if (selectedEntity.type === 'node') {
      const updatedState = {
        ...islandState,
        nodes: islandState.nodes.filter(n => n.id !== selectedEntity.id),
      };
      setIslandState(updatedState);
      saveIslandState(islandState.id, updatedState);
    }
    
    setSelectedEntity(null);
  };
  
  const updateCharacterState = (charId: string, newState: CharacterActivityState) => {
    setCharacterStates(prev => ({
      ...prev,
      [charId]: {
        ...prev[charId],
        state: newState,
        stateStartTime: Date.now(),
      }
    }));
  };
  
  const resetCamera = () => {
    setCamera(createDefaultCamera());
  };
  
  return (
    <Layout>
      <div className="flex h-[calc(100vh-100px)] gap-4">
        {/* Toolbar */}
        <div className="w-64 flex flex-col gap-4">
          <Card className="bg-slate-900/90 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-400 font-cinzel flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Admin Map Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Edit Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={editMode === 'select' ? 'default' : 'outline'}
                    onClick={() => setEditMode('select')}
                    className="text-xs"
                  >
                    <MousePointer className="w-3 h-3 mr-1" /> Select
                  </Button>
                  <Button
                    size="sm"
                    variant={editMode === 'move' ? 'default' : 'outline'}
                    onClick={() => setEditMode('move')}
                    className="text-xs"
                  >
                    <Move className="w-3 h-3 mr-1" /> Move
                  </Button>
                  <Button
                    size="sm"
                    variant={editMode === 'add_node' ? 'default' : 'outline'}
                    onClick={() => setEditMode('add_node')}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Node
                  </Button>
                  <Button
                    size="sm"
                    variant={editMode === 'add_hero' ? 'default' : 'outline'}
                    onClick={() => setEditMode('add_hero')}
                    className="text-xs"
                  >
                    <Users className="w-3 h-3 mr-1" /> Add Hero
                  </Button>
                </div>
              </div>
              
              {editMode === 'add_node' && (
                <div className="space-y-2 pt-2 border-t border-slate-700">
                  <Label className="text-xs text-slate-400">Node Type</Label>
                  <Select value={newNodeType} onValueChange={setNewNodeType}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ore">⛏️ Ore (Mining)</SelectItem>
                      <SelectItem value="Tree">🌲 Tree (Logging)</SelectItem>
                      <SelectItem value="Herb">🌿 Herb (Herbalism)</SelectItem>
                      <SelectItem value="Fish">🐟 Fish (Fishing)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-xs text-slate-400">Rarity</Label>
                  <Select value={newNodeRarity} onValueChange={setNewNodeRarity}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="common">Common</SelectItem>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="epic">Epic</SelectItem>
                      <SelectItem value="legendary">Legendary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <Label className="text-xs text-slate-400">Visibility</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Grid</span>
                    <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Nodes</span>
                    <Switch checked={showNodes} onCheckedChange={setShowNodes} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Heroes</span>
                    <Switch checked={showHeroes} onCheckedChange={setShowHeroes} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <Label className="text-xs text-slate-400">Camera</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCamera(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.25) }))}>
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCamera(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.25) }))}>
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetCamera}>
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
                <div className="text-xs text-slate-500">
                  Pos: ({camera.x.toFixed(0)}, {camera.y.toFixed(0)}) | Zoom: {camera.zoom.toFixed(1)}x
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Selected Entity Panel */}
          {selectedEntity && (
            <Card className="bg-slate-900/90 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-400 flex items-center justify-between">
                  Selected: {selectedEntity.type}
                  <Button size="sm" variant="destructive" onClick={deleteSelectedEntity}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-300">
                <p>ID: {selectedEntity.id.substring(0, 8)}...</p>
                {selectedEntity.type === 'node' && islandState && (
                  <>
                    {(() => {
                      const node = islandState.nodes.find(n => n.id === selectedEntity.id);
                      if (!node) return null;
                      return (
                        <div className="space-y-1 mt-2">
                          <p>Name: {node.name}</p>
                          <p>Position: ({node.x.toFixed(1)}, {node.y.toFixed(1)})</p>
                          <p>Profession: {node.profession}</p>
                          <p>Rarity: {node.rarity}</p>
                        </div>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Character States Panel */}
          <Card className="bg-slate-900/90 border-slate-700 flex-1 overflow-auto">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Character States
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(characterStates).slice(0, 5).map(([charId, state]) => {
                const char = allCharacters.find(c => c.id === charId);
                if (!char) return null;
                return (
                  <div key={charId} className="p-2 bg-slate-800/50 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">{char.name}</span>
                      <Badge className={cn("text-[9px]", STATE_COLORS[state.state])}>
                        {STATE_DISPLAY_NAMES[state.state]}
                      </Badge>
                    </div>
                    <div className="text-slate-400">
                      Pos: ({state.location.worldX.toFixed(0)}, {state.location.worldY.toFixed(0)})
                    </div>
                    <Select 
                      value={state.state} 
                      onValueChange={(val) => updateCharacterState(charId, val as CharacterActivityState)}
                    >
                      <SelectTrigger className="h-6 mt-1 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATE_DISPLAY_NAMES).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          
          <Link href="/island">
            <Button variant="outline" className="w-full">
              Back to Island
            </Button>
          </Link>
        </div>
        
        {/* Map View */}
        <div 
          ref={mapContainerRef}
          className="flex-1 relative overflow-hidden rounded-xl border-2 border-amber-900/50 shadow-2xl bg-slate-950"
          onClick={handleMapClick}
          data-testid="admin-map"
        >
          {/* Background */}
          <div 
            className="absolute bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url(${assetUrl('/backgrounds/island-map.png')})`,
              backgroundSize: 'cover',
              width: '200%',
              height: '200%',
              ...getBackgroundTransform(camera),
            }}
          />
          
          {/* Grid overlay */}
          {showGrid && (
            <div 
              className="absolute pointer-events-none opacity-20"
              style={{ 
                width: '200%',
                height: '200%',
                ...getBackgroundTransform(camera),
              }}
            >
              <div className="w-full h-full grid grid-cols-20 grid-rows-20">
                {Array.from({ length: 400 }).map((_, i) => (
                  <div key={i} className="border border-cyan-400/50" />
                ))}
              </div>
            </div>
          )}
          
          {/* Entity layer */}
          <div 
            className="absolute"
            style={{ 
              width: '200%',
              height: '200%',
              ...getBackgroundTransform(camera),
            }}
          >
            {/* Nodes */}
            {showNodes && islandState?.nodes.map(node => {
              const isSelected = selectedEntity?.type === 'node' && selectedEntity?.id === node.id;
              const rarityConfig = NODE_RARITY_CONFIG[node.rarity || 'common'];
              
              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editMode === 'select') {
                      setSelectedEntity({ type: 'node', id: node.id });
                    }
                  }}
                  className={cn(
                    "absolute flex flex-col items-center cursor-pointer z-10 transition-all",
                    isSelected && "ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent"
                  )}
                  style={{ 
                    left: `${node.x}%`, 
                    top: `${node.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className={cn(
                    "p-1 rounded-lg border-2 bg-slate-900/80",
                    rarityConfig.borderColor
                  )}>
                    <span className="text-lg">{node.icon}</span>
                  </div>
                  <div className={cn(
                    "mt-0.5 px-1 py-0.5 rounded text-[9px] font-bold",
                    rarityConfig.bgColor, rarityConfig.textColor
                  )}>
                    {node.name}
                  </div>
                </div>
              );
            })}
            
            {/* Heroes */}
            {showHeroes && Object.entries(characterStates).map(([charId, state]) => {
              const char = allCharacters.find(c => c.id === charId);
              if (!char) return null;
              const isSelected = selectedEntity?.type === 'hero' && selectedEntity?.id === charId;
              
              return (
                <div
                  key={charId}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editMode === 'select') {
                      setSelectedEntity({ type: 'hero', id: charId });
                    }
                  }}
                  className={cn(
                    "absolute flex flex-col items-center cursor-pointer z-20 transition-all",
                    isSelected && "ring-2 ring-amber-400"
                  )}
                  style={{ 
                    left: `${state.location.worldX}%`, 
                    top: `${state.location.worldY}%`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2",
                    STATE_COLORS[state.state],
                    "border-white/50"
                  )}>
                    {char.name.charAt(0)}
                  </div>
                  <div className="mt-0.5 px-1 py-0.5 bg-black/80 rounded text-[8px] text-white font-bold">
                    {char.name}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Mode indicator */}
          <div className="absolute top-4 left-4 bg-slate-900/90 text-amber-400 px-3 py-1 rounded-lg text-sm font-bold border border-amber-900/50">
            Mode: {editMode.replace('_', ' ').toUpperCase()}
          </div>
          
          {/* Coordinates display */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700">
            WASD: Pan | Scroll: Zoom | ESC: Deselect
          </div>
        </div>
      </div>
    </Layout>
  );
}
