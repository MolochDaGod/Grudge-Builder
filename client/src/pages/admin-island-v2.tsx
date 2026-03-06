import { useState, useEffect, useRef, useCallback } from "react";
import { GameViewportLayout } from "@/components/GameViewportLayout";
import { CharacterManager, Character } from "@/lib/characterManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAccountResources } from "@/hooks/use-account";
import { Loader2, Play, Pause, Home, RefreshCw, Zap, Shield, Settings, Users, Eye, MapPin, Clock, Bug, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  IslandEngine,
  IslandRenderer,
  createCharacterAnimations,
  HarvestEvent,
  CharacterState,
} from "@/island";
import {
  ResourceNode,
  IslandState,
  generateIslandNodes,
  loadIslandState,
  saveIslandState,
  createNewIsland,
  NODE_RARITY_CONFIG,
} from "@/lib/islandSystem";

const WORLD_SIZE = 800;
const TILE_SIZE = 32;

function getDefaultSpriteConfig() {
  return {
    spriteSheet: '/sprites/topdown/characters/hero_idle.png',
    frameWidth: 32,
    frameHeight: 32,
    animations: createCharacterAnimations([0], [0, 1, 2, 3], [0, 1], [0]),
    scale: 2,
  };
}

interface GMSettings {
  infiniteStamina: boolean;
  speedMultiplier: number;
  showDebugInfo: boolean;
  autoHarvest: boolean;
  godMode: boolean;
  instantRespawn: boolean;
}

export default function AdminIslandV2Page() {
  const { toast } = useToast();
  const { batchAddResources } = useAccountResources();
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<IslandEngine | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [islandState, setIslandState] = useState<IslandState | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [, setRenderTick] = useState(0);
  const [activeCharacters, setActiveCharacters] = useState<Set<string>>(new Set());
  
  const [gmSettings, setGmSettings] = useState<GMSettings>({
    infiniteStamina: false,
    speedMultiplier: 1,
    showDebugInfo: true,
    autoHarvest: false,
    godMode: false,
    instantRespawn: false,
  });

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : '📋';
    setLogs(prev => [`[${timestamp}] ${prefix} ${msg}`, ...prev].slice(0, 50));
  }, []);

  const handleHarvest = useCallback((event: HarvestEvent) => {
    const lootNames = event.loot.map(l => `${l.minQuantity}x ${l.name}`).join(", ");
    addLog(`Harvested: ${lootNames} (+${event.xpGained} XP)`, 'success');
    
    if (event.loot.length > 0) {
      batchAddResources(
        event.loot.map(item => ({ 
          resourceId: item.itemId, 
          amount: item.minQuantity 
        }))
      ).catch(e => addLog(`Failed to add resources: ${e}`, 'error'));
    }
  }, [addLog, batchAddResources]);

  const handleStateChange = useCallback((characterId: string, state: CharacterState) => {
    const char = characters.find(c => c.id === characterId);
    const name = char?.name || characterId.slice(0, 8);
    addLog(`${name} → ${state.toUpperCase()}`);
    setRenderTick(t => t + 1);
  }, [addLog, characters]);

  const handleStaminaDepleted = useCallback((characterId: string) => {
    const char = characters.find(c => c.id === characterId);
    const name = char?.name || characterId.slice(0, 8);
    
    if (gmSettings.infiniteStamina) {
      const engine = engineRef.current;
      if (engine) {
        const actor = engine.characters.get(characterId);
        if (actor) {
          actor.stamina = 100;
          addLog(`${name} stamina restored (GM: Infinite Stamina)`, 'warning');
        }
      }
    } else {
      addLog(`${name} is exhausted and sleeping...`, 'warning');
    }
  }, [addLog, characters, gmSettings.infiniteStamina]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const chars = await CharacterManager.getAll();
        setCharacters(chars);
        addLog(`Loaded ${chars.length} characters from database`, 'success');
        
        const userId = "guest";
        let state = await loadIslandState(userId);
        if (!state) {
          state = createNewIsland(userId);
          await saveIslandState(userId, state);
          addLog("Created new island state", 'info');
        }
        setIslandState(state);
        
        const engine = new IslandEngine(
          { worldWidth: WORLD_SIZE, worldHeight: WORLD_SIZE, tileSize: TILE_SIZE },
          {
            onHarvest: handleHarvest,
            onCharacterStateChange: handleStateChange,
            onStaminaDepleted: handleStaminaDepleted,
          }
        );
        
        const campX = WORLD_SIZE / 2;
        const campY = WORLD_SIZE / 2;
        
        chars.slice(0, 5).forEach((char, i) => {
          const offsetX = (i % 3 - 1) * 60;
          const offsetY = Math.floor(i / 3) * 60;
          engine.addCharacter(
            char.id,
            campX + offsetX,
            campY + offsetY,
            getDefaultSpriteConfig()
          );
          setActiveCharacters(prev => new Set(prev).add(char.id));
        });
        
        state.nodes.forEach(node => {
          const worldX = (node.x / 100) * WORLD_SIZE;
          const worldY = (node.y / 100) * WORLD_SIZE;
          
          engine.addResourceNode(node.id, worldX, worldY, {
            name: node.name,
            type: node.type,
            profession: node.profession,
            tier: node.tier,
            rarity: node.rarity,
            icon: node.icon,
            harvestIntervalMs: node.harvestIntervalMinutes * 60 * 1000,
            drops: node.drops,
            expiresAt: node.expiresAt,
          });
        });
        
        engine.camera.centerOn(campX, campY);
        engineRef.current = engine;
        
        addLog("Admin Island V2 ready. GM controls enabled.", 'success');
      } catch (error) {
        addLog(`Failed to load: ${error}`, 'error');
      }
      
      setIsLoading(false);
    };
    
    loadData();
    
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setRenderTick(t => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleTileClick = useCallback((worldX: number, worldY: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    if (selectedCharacterId) {
      engine.moveCharacterTo(selectedCharacterId, worldX, worldY);
      const char = characters.find(c => c.id === selectedCharacterId);
      addLog(`Moving ${char?.name || 'hero'} to (${Math.round(worldX)}, ${Math.round(worldY)})`);
    }
  }, [selectedCharacterId, addLog, characters]);

  const toggleEngine = () => {
    const engine = engineRef.current;
    if (!engine) return;
    
    if (isRunning) {
      engine.stop();
      setIsRunning(false);
      addLog("Simulation PAUSED", 'warning');
    } else {
      engine.start();
      setIsRunning(true);
      addLog("Simulation STARTED", 'success');
    }
  };

  const returnToCamp = () => {
    const engine = engineRef.current;
    if (!engine) return;
    
    const campX = WORLD_SIZE / 2;
    const campY = WORLD_SIZE / 2;
    
    const chars = Array.from(engine.characters.values());
    chars.forEach((char, i) => {
      const offsetX = (i % 3 - 1) * 60;
      const offsetY = Math.floor(i / 3) * 60;
      engine.moveCharacterTo(char.id, campX + offsetX, campY + offsetY);
    });
    
    engine.camera.centerOn(campX, campY);
    addLog("All heroes returning to camp");
  };

  const refreshNodes = async () => {
    if (!islandState || !engineRef.current) return;
    
    const engine = engineRef.current;
    engine.resourceNodes.forEach((_, id) => {
      engine.removeResourceNode(id);
    });
    
    const newNodes = generateIslandNodes(`refresh-${Date.now()}`);
    const updatedState: IslandState = { ...islandState, nodes: newNodes };
    setIslandState(updatedState);
    await saveIslandState("guest", updatedState);
    
    newNodes.forEach(node => {
      const worldX = (node.x / 100) * WORLD_SIZE;
      const worldY = (node.y / 100) * WORLD_SIZE;
      engine.addResourceNode(node.id, worldX, worldY, {
        name: node.name,
        type: node.type,
        profession: node.profession,
        tier: node.tier,
        rarity: node.rarity,
        icon: node.icon,
        harvestIntervalMs: node.harvestIntervalMinutes * 60 * 1000,
        drops: node.drops,
        expiresAt: node.expiresAt,
      });
    });
    
    addLog(`Spawned ${newNodes.length} new resource nodes`, 'success');
  };

  const restoreAllStamina = () => {
    const engine = engineRef.current;
    if (!engine) return;
    
    engine.characters.forEach((actor) => {
      actor.stamina = 100;
    });
    
    addLog("All heroes stamina restored to 100%", 'success');
    toast({
      title: "GM Action",
      description: "All heroes stamina has been restored.",
    });
  };

  const teleportAll = (targetX: number, targetY: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    engine.characters.forEach((actor, id) => {
      engine.moveCharacterTo(id, targetX, targetY);
    });
    
    addLog(`Teleported all heroes to (${targetX}, ${targetY})`, 'success');
  };

  const addCharacterToIsland = (charId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    if (activeCharacters.has(charId)) {
      addLog("Character already on island", 'warning');
      return;
    }
    
    const char = characters.find(c => c.id === charId);
    if (!char) return;
    
    const campX = WORLD_SIZE / 2;
    const campY = WORLD_SIZE / 2;
    
    engine.addCharacter(
      char.id,
      campX + (Math.random() - 0.5) * 100,
      campY + (Math.random() - 0.5) * 100,
      getDefaultSpriteConfig()
    );
    
    setActiveCharacters(prev => new Set(prev).add(charId));
    addLog(`Added ${char.name} to island`, 'success');
  };

  const removeCharacterFromIsland = (charId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    engine.removeCharacter(charId);
    setActiveCharacters(prev => {
      const next = new Set(prev);
      next.delete(charId);
      return next;
    });
    
    const char = characters.find(c => c.id === charId);
    addLog(`Removed ${char?.name || charId} from island`, 'warning');
  };

  if (isLoading) {
    return (
      <GameViewportLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="w-64">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
              <p className="text-muted-foreground">Loading Admin Island...</p>
            </CardContent>
          </Card>
        </div>
      </GameViewportLayout>
    );
  }

  const engine = engineRef.current;

  return (
    <GameViewportLayout>
      <div className="flex h-full gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-cinzel flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-500" />
                  Admin Island V2
                </CardTitle>
                <Badge variant={isRunning ? "default" : "secondary"}>
                  {isRunning ? "RUNNING" : "PAUSED"}
                </Badge>
                {gmSettings.godMode && (
                  <Badge variant="destructive">GOD MODE</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={isRunning ? "destructive" : "default"}
                  size="sm"
                  onClick={toggleEngine}
                  data-testid="btn-toggle-engine"
                >
                  {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isRunning ? "Pause" : "Start"}
                </Button>
                <Button variant="outline" size="sm" onClick={returnToCamp} data-testid="btn-return-camp">
                  <Home className="w-4 h-4 mr-1" />
                  Camp
                </Button>
                <Button variant="outline" size="sm" onClick={refreshNodes} data-testid="btn-refresh-nodes">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Respawn
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1" ref={containerRef}>
              {engine && (
                <IslandRenderer
                  engine={engine}
                  width={viewportSize.width}
                  height={viewportSize.height}
                  onTileClick={handleTileClick}
                />
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-24">
                <div className="space-y-1 text-xs font-mono">
                  {logs.map((log, i) => (
                    <div key={i} className="text-muted-foreground hover:text-foreground transition-colors">
                      {log}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="w-80 flex flex-col gap-4">
          <Tabs defaultValue="heroes" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="heroes" data-testid="tab-heroes">
                <Users className="w-4 h-4 mr-1" />
                Heroes
              </TabsTrigger>
              <TabsTrigger value="gm" data-testid="tab-gm">
                <Settings className="w-4 h-4 mr-1" />
                GM
              </TabsTrigger>
              <TabsTrigger value="debug" data-testid="tab-debug">
                <Bug className="w-4 h-4 mr-1" />
                Debug
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="heroes" className="mt-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Characters</CardTitle>
                  <CardDescription className="text-xs">
                    {activeCharacters.size} active on island
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ScrollArea className="h-64">
                    {characters.map((char) => {
                      const isActive = activeCharacters.has(char.id);
                      const actor = engine?.characters.get(char.id);
                      const isSelected = selectedCharacterId === char.id;
                      
                      return (
                        <div
                          key={char.id}
                          className={`p-2 rounded-lg border mb-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-500/10' 
                              : 'border-border hover:border-muted-foreground'
                          }`}
                          onClick={() => isActive && setSelectedCharacterId(char.id)}
                          data-testid={`hero-${char.id}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{char.name}</span>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                Lv.{char.level}
                              </Badge>
                              {isActive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCharacterFromIsland(char.id);
                                  }}
                                >
                                  ✕
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addCharacterToIsland(char.id);
                                  }}
                                >
                                  +
                                </Button>
                              )}
                            </div>
                          </div>
                          {isActive && actor && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Stamina</span>
                                <span>{Math.round(actor.stamina)}%</span>
                              </div>
                              <Progress value={actor.stamina} className="h-1" />
                              <div className="flex items-center gap-1 text-xs">
                                <Badge variant="secondary" className="text-[10px] py-0">
                                  {actor.state}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="gm" className="mt-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    GM Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="infinite-stamina" className="text-sm">Infinite Stamina</Label>
                    <Switch
                      id="infinite-stamina"
                      checked={gmSettings.infiniteStamina}
                      onCheckedChange={(v) => setGmSettings(s => ({ ...s, infiniteStamina: v }))}
                      data-testid="switch-infinite-stamina"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="god-mode" className="text-sm">God Mode</Label>
                    <Switch
                      id="god-mode"
                      checked={gmSettings.godMode}
                      onCheckedChange={(v) => setGmSettings(s => ({ ...s, godMode: v }))}
                      data-testid="switch-god-mode"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-harvest" className="text-sm">Auto Harvest</Label>
                    <Switch
                      id="auto-harvest"
                      checked={gmSettings.autoHarvest}
                      onCheckedChange={(v) => setGmSettings(s => ({ ...s, autoHarvest: v }))}
                      data-testid="switch-auto-harvest"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Speed Multiplier: {gmSettings.speedMultiplier}x</Label>
                    <Slider
                      value={[gmSettings.speedMultiplier]}
                      onValueChange={([v]) => setGmSettings(s => ({ ...s, speedMultiplier: v }))}
                      min={0.5}
                      max={5}
                      step={0.5}
                      data-testid="slider-speed"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={restoreAllStamina}
                      data-testid="btn-restore-stamina"
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      Heal All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => teleportAll(WORLD_SIZE / 2, WORLD_SIZE / 2)}
                      data-testid="btn-teleport"
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Teleport
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="debug" className="mt-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Debug Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-debug" className="text-sm">Show Overlays</Label>
                    <Switch
                      id="show-debug"
                      checked={gmSettings.showDebugInfo}
                      onCheckedChange={(v) => setGmSettings(s => ({ ...s, showDebugInfo: v }))}
                      data-testid="switch-debug-info"
                    />
                  </div>
                  
                  <div className="space-y-1 p-2 bg-muted rounded">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Engine:</span>
                      <span>{isRunning ? 'Running' : 'Paused'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Characters:</span>
                      <span>{activeCharacters.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nodes:</span>
                      <span>{islandState?.nodes.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Viewport:</span>
                      <span>{viewportSize.width}x{viewportSize.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">World:</span>
                      <span>{WORLD_SIZE}x{WORLD_SIZE}</span>
                    </div>
                    {engine && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Camera X:</span>
                          <span>{Math.round(engine.camera.x)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Camera Y:</span>
                          <span>{Math.round(engine.camera.y)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zoom:</span>
                          <span>{engine.camera.zoom.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </GameViewportLayout>
  );
}
