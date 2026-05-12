import { useState, useEffect, useRef, useCallback } from "react";
import { GameViewportLayout } from "@/components/GameViewportLayout";
import { CharacterManager, Character } from "@/lib/characterManager";
import { getDeviceId, getCurrentUser } from "@/lib/grudgeBackend";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAccountResources } from "@/hooks/use-account";
import { Loader2, Play, Pause, Home, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
import { assetUrl } from "@/lib/assetConfig";

const WORLD_SIZE = 800;
const TILE_SIZE = 32;

function getDefaultSpriteConfig() {
  return {
    spriteSheet: assetUrl("/sprites/topdown/characters/hero_idle.png"),
    frameWidth: 32,
    frameHeight: 32,
    animations: createCharacterAnimations([0], [0, 1, 2, 3], [0, 1], [0]),
    scale: 2,
  };
}

export default function IslandV2Page() {
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

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 20));
  }, []);

  const handleHarvest = useCallback((event: HarvestEvent) => {
    const lootNames = event.loot.map(l => `${l.minQuantity}x ${l.name}`).join(", ");
    addLog(`Character harvested: ${lootNames} (+${event.xpGained} XP)`);
    
    if (event.loot.length > 0) {
      batchAddResources(
        event.loot.map(item => ({ 
          resourceId: item.itemId, 
          amount: item.minQuantity 
        }))
      ).catch(e => console.error('Failed to add resources:', e));
    }
  }, [addLog, batchAddResources]);

  const handleStateChange = useCallback((characterId: string, state: CharacterState) => {
    addLog(`${characterId.slice(0, 8)} is now ${state}`);
    setRenderTick(t => t + 1);
  }, [addLog]);

  const handleStaminaDepleted = useCallback((characterId: string) => {
    addLog(`${characterId.slice(0, 8)} is exhausted and sleeping...`);
    toast({
      title: "Hero Exhausted",
      description: "Your hero needs to rest before continuing.",
    });
  }, [addLog, toast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      const chars = await CharacterManager.getAll();
      setCharacters(chars);

      // Use the authenticated user's ID; fall back to device ID for guests
      const authUser = getCurrentUser();
      const userId = authUser?.grudgeId || authUser?.id?.toString() || getDeviceId();
      let state = await loadIslandState(userId);
      if (!state) {
        state = createNewIsland(userId);
        await saveIslandState(userId, state);
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
      
      setIsLoading(false);
      addLog("Island loaded. Click a hero to select, then click a resource node.");
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
      addLog(`Moving hero to (${Math.round(worldX)}, ${Math.round(worldY)})`);
    }
  }, [selectedCharacterId, addLog]);

  const toggleEngine = () => {
    const engine = engineRef.current;
    if (!engine) return;
    
    if (isRunning) {
      engine.stop();
      setIsRunning(false);
      addLog("Simulation paused");
    } else {
      engine.start();
      setIsRunning(true);
      addLog("Simulation started");
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
    
    const existingNodes = Array.from(engine.resourceNodes.keys());
    for (const nodeId of existingNodes) {
      engine.removeResourceNode(nodeId);
    }
    
    const newNodes = generateIslandNodes(islandState.id + Date.now());
    
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
    
    setIslandState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, nodes: newNodes, lastUpdate: Date.now() };
      saveIslandState(prev.id, updated);
      return updated;
    });
    
    addLog("Resources refreshed!");
    setRenderTick(t => t + 1);
  };

  if (isLoading) {
    return (
      <GameViewportLayout title="Island V2">
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-amber-400 mx-auto mb-4" />
            <p className="text-slate-400">Loading island...</p>
          </div>
        </div>
      </GameViewportLayout>
    );
  }

  const engine = engineRef.current;

  return (
    <GameViewportLayout title="Island V2">
      <div className="flex h-full">
        <div 
          ref={containerRef}
          className="flex-1 relative bg-slate-900"
          data-testid="island-viewport"
        >
          {engine && (
            <IslandRenderer
              engine={engine}
              width={viewportSize.width}
              height={viewportSize.height}
              onTileClick={handleTileClick}
            />
          )}
          
          <div className="absolute top-4 left-4 flex gap-2 z-20">
            <Button
              size="sm"
              variant={isRunning ? "destructive" : "default"}
              onClick={toggleEngine}
              data-testid="toggle-engine"
            >
              {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={returnToCamp}
              data-testid="return-camp"
            >
              <Home className="w-4 h-4 mr-1" />
              Camp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshNodes}
              data-testid="refresh-nodes"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="w-72 bg-slate-800 border-l border-slate-700 overflow-y-auto">
          <Card className="m-2 bg-slate-900 border-slate-700">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm text-amber-400">Heroes</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3 space-y-2">
              {engine && (() => {
                const chars = Array.from(engine.characters.values());
                return chars.map(char => {
                  const dbChar = characters.find(c => c.id === char.id);
                  const isSelected = selectedCharacterId === char.id;
                  
                  return (
                    <div
                      key={char.id}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-amber-900/50 border border-amber-500' 
                          : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                      }`}
                      onClick={() => {
                        setSelectedCharacterId(isSelected ? null : char.id);
                        if (!isSelected) {
                          engine.focusOnCharacter(char.id);
                        }
                      }}
                      data-testid={`hero-card-${char.id}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm text-slate-200">
                          {dbChar?.name || char.id.slice(0, 8)}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          char.state === 'harvesting' ? 'bg-green-900 text-green-300' :
                          char.state === 'walking' ? 'bg-blue-900 text-blue-300' :
                          char.state === 'sleeping' ? 'bg-purple-900 text-purple-300' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {char.state}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Stamina</span>
                        <Progress 
                          value={(char.stamina / char.maxStamina) * 100} 
                          className="h-1.5 flex-1"
                        />
                        <span className="text-xs text-slate-400">
                          {Math.round(char.stamina)}%
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </CardContent>
          </Card>
          
          <Card className="m-2 bg-slate-900 border-slate-700">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm text-amber-400">Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {logs.map((log, i) => (
                  <p key={i} className="text-xs text-slate-400">
                    {log}
                  </p>
                ))}
                {logs.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="m-2 bg-slate-900 border-slate-700">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm text-amber-400">Controls</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Click hero to select</li>
                <li>• Click map to move hero</li>
                <li>• Drag to pan camera</li>
                <li>• Scroll to zoom</li>
                <li>• Walk to node to harvest</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </GameViewportLayout>
  );
}
