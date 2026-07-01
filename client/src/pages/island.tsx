import { useState, useEffect, useRef } from "react";
import { GameViewportLayout } from "@/components/GameViewportLayout";
import { CharacterManager, Character } from "@/lib/characterManager";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import SpriteAnimator from "@/components/SpriteAnimator";
import AnimalSprite from "@/components/AnimalSprite";
import { IslandCutscene } from "@/components/IslandCutscene";
import { useCharacters } from "@/hooks/use-characters";
import { fetchCurrentHomeIsland, type HomeIslandDto } from "@/lib/homeIslandApi";
import { buildHomeDungeonUrl } from "@/lib/homeIslandDungeon";
import { getIslandMapFallback, TERRAIN_ZONE_COLORS } from "@/lib/islandMapAssets";
import { islandStateToHomeState, resolveAuthoritativeIsland } from "@/lib/islandStateBridge";
import { renderIslandMapToDataUrl } from "@/lib/islandMapRenderer";
import { RACES, CLASSES, getSpriteSetForCharacter } from "@/lib/gameData";
import { getCharacterPalette } from "@/lib/spriteManifest";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAccountResources } from "@/hooks/use-account";
import * as professionSystem from "@/lib/professionSystem";
import {
  ResourceNode,
  IslandState,
  Sheep,
  Animal,
  AnimalType,
  ANIMAL_CONFIGS,
  ANIMAL_RARITY_COLORS,
  SkinningNode,
  CollisionBody,
  COLLISION_DEFAULTS,
  createCollisionBody,
  checkBodyCollision,
  findNonCollidingPosition as findNonCollidingPositionFromBodies,
  generateIslandNodes,
  rollLoot,
  rollGatherSuccess,
  getNodeStatus,
  canHarvest,
  getNodeTimeRemaining,
  formatTimeRemaining,
  createNewIsland,
  saveIslandState,
  loadIslandState,
  getEffectiveHarvestInterval,
  getGatherSuccessChance,
  spawnAnimal,
  spawnSheep,
  killAnimal,
  killSheep,
  createSkinningNode,
  isSkinningNodeExpired,
  getSkinningNodeTimeRemaining,
  canHarvestSkinningNode,
  MAX_SHEEP,
  CRAFTING_RESOURCES,
  NODE_RARITY_CONFIG,
  NodeRarity,
} from "@/lib/islandSystem";
import { puterAI, isPuterAvailable, puterKV } from "@/lib/puterIntegration";
import { Loader2, MapPin, Timer, Package, Users, Sparkles, RefreshCw, Home, Settings, Play, Pause, Eye, Hammer, Box, Grid2X2 } from "lucide-react";
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';
import type { MountainTriadSeed } from '@shared/definitions/homeIslandSeed';
import type { RtsHeightmapPayload } from '@shared/definitions/rtsTerrainBridge';
import type { RtsNatureScatterPayload } from '@shared/definitions/rtsNatureScatter';
import { to2DNodeStates, type SharedIslandState } from '@/island3d/sync/IslandStateSync';
import { captureIslandTopDown, clearTopDownCache } from '@/island3d/render/IslandTopDownCapture';
import { 
  CameraState, 
  worldToScreen, 
  screenToWorld, 
  panCamera, 
  zoomCamera, 
  centerCameraOn, 
  createDefaultCamera,
  getBackgroundTransform,
} from "@/lib/islandCamera";
import { generateIslandGrid, type IslandTileGrid } from "@/lib/islandTileGrid";
import { findPath, worldToTileCoord, findNearestWalkable, type WorldPos } from "@/lib/islandPathfinder";
import { HeroMovementManager } from "@/lib/heroMovementSystem";
import {
  type IslandBuilding,
  type BuildingType,
  BUILDING_DEFS,
  getIslandBonuses,
  canPlaceBuilding,
  getAvailableBuildings,
  getMaxHeroes,
  BASE_HERO_SLOTS,
} from "@/lib/islandBuildings";
import { 
  CharacterStateData, 
  createCharacterState, 
  STATE_DISPLAY_NAMES, 
  STATE_COLORS,
  STAMINA_CONFIG,
  calculateHarvestStaminaCost,
  canHarvestWithStamina,
  needsSleep,
  consumeStamina,
  recoverStamina,
  isFullyRested,
  CharacterActivityState,
} from "@/lib/characterState";
import IslandSidebar, { ActivityLogEntry } from "@/components/IslandSidebar";
import { HarvestPopupManager, SleepingZZZ } from "@/components/HarvestPopup";
import { Link } from "wouter";
import { IslandChat } from "@/components/IslandChat";
import { HeroCommandBar } from "@/components/HeroCommandBar";
import { CommPanel } from "@/components/CommPanel";
import { assetUrl } from "@/lib/assetConfig";

const MAP_STYLES = ['iron', 'fantasy', 'tactical', 'night'] as const;

interface HeroPosition {
  x: number;
  y: number;
  action: 'idle' | 'walk' | 'attack';
  facing: 'left' | 'right';
  collisionBody: CollisionBody;
}

function buildCollisionBodies(
  heroPositions: Record<string, HeroPosition>,
  islandState: IslandState | null
): CollisionBody[] {
  const bodies: CollisionBody[] = [];
  
  for (const [heroId, pos] of Object.entries(heroPositions)) {
    bodies.push(pos.collisionBody);
  }
  
  if (islandState) {
    for (const node of islandState.nodes) {
      bodies.push(createCollisionBody(node.id, 'node', node.x, node.y));
    }
    for (const sheep of islandState.sheep) {
      if (sheep.state === 'alive') {
        bodies.push(createCollisionBody(sheep.id, 'sheep', sheep.x, sheep.y));
      }
    }
    for (const skinning of islandState.skinningNodes) {
      bodies.push(createCollisionBody(skinning.id, 'skinning', skinning.x, skinning.y));
    }
  }
  
  return bodies;
}

function findNonCollidingPosition(
  targetX: number, 
  targetY: number, 
  heroId: string,
  heroPositions: Record<string, HeroPosition>,
  islandState: IslandState | null
): {x: number, y: number} {
  const allBodies = buildCollisionBodies(heroPositions, islandState);
  return findNonCollidingPositionFromBodies(targetX, targetY, heroId, allBodies, COLLISION_DEFAULTS.hero.radius);
}

function createHeroPosition(
  heroId: string,
  x: number,
  y: number,
  action: 'idle' | 'walk' | 'attack',
  facing: 'left' | 'right' = 'right'
): HeroPosition {
  return {
    x,
    y,
    action,
    facing,
    collisionBody: createCollisionBody(heroId, 'hero', x, y),
  };
}

function updateHeroPosition(
  prev: HeroPosition | undefined,
  heroId: string,
  x: number,
  y: number,
  action: 'idle' | 'walk' | 'attack',
  facing?: 'left' | 'right'
): HeroPosition {
  const collisionBody = createCollisionBody(heroId, 'hero', x, y);
  if (prev) {
    collisionBody.velocity = prev.collisionBody.velocity;
  }
  // Infer facing from movement direction if not explicitly provided
  const resolvedFacing = facing ?? (prev ? (x > prev.x ? 'right' : x < prev.x ? 'left' : prev.facing) : 'right');
  return { x, y, action, facing: resolvedFacing, collisionBody };
}

interface ReconcileResult {
  updatedNodes: ResourceNode[];
  updatedAssignedHeroes: Record<string, string>;
  freedHeroIds: string[];
  respawnCount: number;
}

function reconcileExpiredNodes(state: IslandState, now: number): ReconcileResult | null {
  const expiredNodes = state.nodes.filter(n => getNodeStatus(n) === 'expired');
  if (expiredNodes.length === 0) return null;
  
  const expiredNodeIds = new Set(expiredNodes.map(n => n.id));
  const freedHeroIds: string[] = [];
  
  // Respawn expired nodes with their original duration
  const updatedNodes = state.nodes.map(node => {
    if (getNodeStatus(node) === 'expired') {
      let durationMs: number;
      if (node.spawnedAt && node.expiresAt) {
        durationMs = node.expiresAt - node.spawnedAt;
      } else {
        durationMs = (node.uptime || 4) * 60 * 60 * 1000;
      }
      return {
        ...node,
        assignedHeroId: undefined,
        lastHarvest: undefined,
        spawnedAt: now,
        expiresAt: now + durationMs,
      };
    }
    return node;
  });
  
  // Clear hero assignments pointing to expired nodes
  const updatedAssignedHeroes: Record<string, string> = {};
  for (const [heroId, nodeId] of Object.entries(state.assignedHeroes || {})) {
    if (expiredNodeIds.has(nodeId)) {
      freedHeroIds.push(heroId);
    } else {
      updatedAssignedHeroes[heroId] = nodeId;
    }
  }
  
  return { updatedNodes, updatedAssignedHeroes, freedHeroIds, respawnCount: expiredNodes.length };
}

/** Convert a string ID to a numeric seed for tile grid generation */
function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function IslandPage() {
  const { toast } = useToast();
  const { batchAddResources, resources, refetch: refetchResources } = useAccountResources();
  const {
    characters: hookCharacters,
    activeCharacter,
    refetch: refetchCharacters,
  } = useCharacters();
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [islandState, setIslandState] = useState<IslandState | null>(null);
  const [heroPositions, setHeroPositions] = useState<Record<string, HeroPosition>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [selectedHero, setSelectedHero] = useState<string | null>(null);
  const [pendingLoot, setPendingLoot] = useState<{itemId: string; name: string; quantity: number}[]>([]);
  const [marketLevel, setMarketLevel] = useState(1);
  const lastIdleCheck = useRef<number>(Date.now());
  const [settingsHero, setSettingsHero] = useState<string | null>(null);
  const [heroAutoMode, setHeroAutoMode] = useState<Record<string, boolean>>({});
  const [heroPriorities, setHeroPriorities] = useState<Record<string, string[]>>({});
  const [camera, setCamera] = useState<CameraState>(createDefaultCamera());
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [characterStates, setCharacterStates] = useState<Record<string, CharacterStateData>>({});
  const [showCutscene, setShowCutscene] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [accountHomeIsland, setAccountHomeIsland] = useState<boolean | null>(null);
  const [homeIslandDto, setHomeIslandDto] = useState<HomeIslandDto | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [harvestPopups, setHarvestPopups] = useState<Array<{
    id: string;
    x: number;
    y: number;
    resourceName: string;
    icon: string;
    xpGained: number;
    quantity: number;
    rarity: string;
  }>>([]);

  // ── Pathfinding + Movement + Buildings state ──
  const tileGridRef = useRef<IslandTileGrid | null>(null);
  const movementMgrRef = useRef(new HeroMovementManager());
  const movementFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());
  const [buildings, setBuildings] = useState<IslandBuilding[]>([]);
  const [buildMode, setBuildMode] = useState<BuildingType | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  /** Map heroId → nodeId the hero is currently pathfinding toward */
  const heroTargetNodeRef = useRef<Record<string, string>>({});

  // Handle cutscene completion - initialize island in backend and set up locally
  const handleCutsceneComplete = async (islandName: string) => {
    setShowCutscene(false);
    
    try {
      // Call API to initialize island (sets homeIsland = true, mints cNFT)
      const { authHeaders } = await import('@/lib/grudgeBackend');
      const response = await fetch('/api/island/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: islandName }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize island');
      }
      
      const result = await response.json();
      setAccountHomeIsland(true);
      
      // Create or load the island state and update with cutscene data
      const { getCurrentUser } = await import('@/lib/grudgeBackend');
      const user = getCurrentUser();
      const userId = user?.grudgeId || user?.username || 'guest';
      const campX = 50; // Center of island
      const campY = 50;
      
      // Load existing state or create new one
      let state = await loadIslandState(userId);
      if (!state) {
        state = createNewIsland(userId);
      }
      
      // Update with cutscene data (name, camp position, first visit complete)
      const updatedState: IslandState = {
        ...state,
        name: islandName,
        isFirstVisit: false,
        campPosition: { x: campX, y: campY },
      };
      
      // Save the updated state
      await saveIslandState(userId, updatedState);
      setIslandState(updatedState);
      
      // Position heroes at camp
      const pos: Record<string, HeroPosition> = {};
      allCharacters.slice(0, 5).forEach((hero, i) => {
        const offsetX = (i % 3) * 3 - 3;
        const offsetY = Math.floor(i / 3) * 3;
        pos[hero.id] = createHeroPosition(hero.id, campX + offsetX, campY + offsetY, 'idle');
      });
      setHeroPositions(pos);
      
      // Generate map if needed
      if (updatedState.mapImageUrl) {
        setMapImageUrl(updatedState.mapImageUrl);
      } else {
        generateIslandMapImage(updatedState.mapStyle, userId, updatedState);
      }
      
      addLog(`Welcome to ${islandName}! Your heroes have established camp.`);
      toast({ title: "Island Claimed!", description: `${islandName} is now your home base. Your island is being minted as an NFT!` });
    } catch (error) {
      console.error('Error initializing island:', error);
      toast({ 
        title: "Error", 
        description: "Failed to initialize island. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Track viewport size for camera calculations
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

  // Center camera on a specific hero
  const focusOnHero = (heroId: string) => {
    const pos = heroPositions[heroId];
    if (pos) {
      setCamera(centerCameraOn({ x: pos.x, y: pos.y }, camera.zoom));
    }
  };

  // Drag state for mouse pan
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // RTS Camera Controls - WASD to pan, scroll wheel to zoom, mouse drag to pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }
      
      const panSpeed = 50; // Screen pixels
      switch (e.key.toLowerCase()) {
        case 'w':
          e.preventDefault();
          setCamera(prev => panCamera(prev, 0, -panSpeed, viewportSize));
          break;
        case 's':
          e.preventDefault();
          setCamera(prev => panCamera(prev, 0, panSpeed, viewportSize));
          break;
        case 'a':
          e.preventDefault();
          setCamera(prev => panCamera(prev, -panSpeed, 0, viewportSize));
          break;
        case 'd':
          e.preventDefault();
          setCamera(prev => panCamera(prev, panSpeed, 0, viewportSize));
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

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setCamera(prev => panCamera(prev, -deltaX, -deltaY, viewportSize));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Global mouse up handler to catch releases outside the map
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Return all heroes to camp
  const returnAllToCamp = () => {
    const campX = islandState?.campPosition?.x || 50;
    const campY = islandState?.campPosition?.y || 50;

    // Stop all active movement
    movementMgrRef.current.clear();
    heroTargetNodeRef.current = {};
    
    // Unassign all heroes from nodes
    setIslandState(prev => {
      if (!prev) return prev;
      const updatedNodes = prev.nodes.map(n => ({ ...n, assignedHeroId: undefined }));
      const updated = { ...prev, nodes: updatedNodes, assignedHeroes: {} };
      saveIslandState(prev.id, updated);
      return updated;
    });
    
    // Pathfind each hero back to camp
    const grid = tileGridRef.current;
    allCharacters.slice(0, 5).forEach((hero, i) => {
      const heroPos = heroPositions[hero.id];
      const offsetX = (i % 3) * 3 - 3;
      const offsetY = Math.floor(i / 3) * 3;
      const targetX = campX + offsetX;
      const targetY = campY + offsetY;

      if (heroPos && grid) {
        const path = findPath(grid, { x: heroPos.x, y: heroPos.y }, { x: targetX, y: targetY });
        if (path.length > 0) {
          movementMgrRef.current.startMovement(hero.id, path, heroPos.x, heroPos.y);
          setHeroPositions(prev => ({
            ...prev,
            [hero.id]: updateHeroPosition(prev[hero.id], hero.id, heroPos.x, heroPos.y, 'walk'),
          }));
          return;
        }
      }
      // Fallback: teleport
      setHeroPositions(prev => ({
        ...prev,
        [hero.id]: createHeroPosition(hero.id, targetX, targetY, 'idle'),
      }));
    });
    
    addLog("All heroes returning to camp!");
  };

  useEffect(() => {
    if (hookCharacters.length > 0) {
      setAllCharacters(hookCharacters);
    }
  }, [hookCharacters]);

  useEffect(() => {
    const loadData = async () => {
      const chars = hookCharacters.length > 0
        ? hookCharacters
        : await CharacterManager.getAll();
      setAllCharacters(chars);
      await refetchCharacters().catch(() => {});

      // First check if account has homeIsland = true (cutscene already completed)
      try {
        const statusResponse = await fetch('/api/island/status');
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setAccountHomeIsland(status.homeIsland);
          
          // If homeIsland is false, show cutscene for first-time visit
          if (!status.homeIsland) {
            setShowCutscene(true);
            setIsCheckingStatus(false);
            // Don't load island data yet - wait for cutscene to complete
            return;
          }
        }
      } catch (error) {
        console.error('Error checking island status:', error);
        // If API fails, fall back to local state check
      }
      
      setIsCheckingStatus(false);

      const { getCurrentUser } = await import('@/lib/grudgeBackend');
      const currentUser = getCurrentUser();
      const userId = currentUser?.grudgeId || currentUser?.username || 'guest';
      const activeId = activeCharacter?.id ?? chars[0]?.id ?? null;

      const { state: resolved, dto } = await resolveAuthoritativeIsland(userId, activeId);
      setHomeIslandDto(dto);
      let state = resolved;
      const hadLocalOnly = !(dto && dto.state.nodes.length > 0);
      if (hadLocalOnly && state.nodes.length > 0) {
        addLog(`Created your new Island! ${chars.length} heroes available.`);
      } else if (!hadLocalOnly) {
        // Respawn expired nodes individually without regenerating entire island
        const reconciled = reconcileExpiredNodes(state, Date.now());
        if (reconciled) {
          state = { 
            ...state, 
            nodes: reconciled.updatedNodes, 
            assignedHeroes: reconciled.updatedAssignedHeroes, 
            lastUpdate: Date.now() 
          };
          await saveIslandState(userId, state);
          addLog(`${reconciled.respawnCount} resource nodes respawned. Welcome back!`);
        } else {
          addLog(`Welcome back! ${chars.length} heroes available.`);
        }
      }
      
      setIslandState(state);

      // Generate tile grid for A* pathfinding (seeded from island id)
      const seed = state.id ? hashSeed(state.id) : Date.now();
      const grid = generateIslandGrid(seed);
      tileGridRef.current = grid;

      // Validate node positions against tile grid walkability
      let nodesNudged = 0;
      const validatedNodes = state.nodes.map(node => {
        if (node.isWaterNode) return node; // Water nodes intentionally in water
        const tile = worldToTileCoord(node.x, node.y);
        if (grid.tiles[tile.ty]?.[tile.tx]?.isWalkable) return node;
        // Node is on non-walkable tile, nudge to nearest walkable
        const nearest = findNearestWalkable(grid, tile.tx, tile.ty);
        if (nearest) {
          const worldX = (nearest.tx / (grid.width - 1)) * 100;
          const worldY = (nearest.ty / (grid.height - 1)) * 100;
          nodesNudged++;
          return { ...node, x: worldX, y: worldY };
        }
        return node;
      });
      if (nodesNudged > 0) {
        state = { ...state, nodes: validatedNodes };
        await saveIslandState(userId, state);
      }
      
      const pos: Record<string, HeroPosition> = {};
      const campX = state.campPosition?.x || 50;
      const campY = state.campPosition?.y || 50;
      chars.slice(0, 5).forEach((c, i) => {
        const assignedNode = state.nodes.find(n => n.assignedHeroId === c.id);
        if (assignedNode) {
          const { x, y } = findNonCollidingPosition(assignedNode.x, assignedNode.y, c.id, pos, state);
          pos[c.id] = createHeroPosition(c.id, x, y, 'attack');
        } else {
          // Position at camp location
          const offsetX = (i % 3) * 3 - 3;
          const offsetY = Math.floor(i / 3) * 3;
          const { x, y } = findNonCollidingPosition(campX + offsetX, campY + offsetY, c.id, pos, state);
          pos[c.id] = createHeroPosition(c.id, x, y, 'idle');
        }
      });
      setHeroPositions(pos);
      
      initializeCharacterStates(chars, campX, campY);

      // Load buildings from saved state
      if ((state as any).buildings) {
        setBuildings((state as any).buildings);
      }
      
      if (state.mapImageUrl) {
        setMapImageUrl(state.mapImageUrl);
      } else {
        generateIslandMapImage(state.mapStyle, state.id || userId, state);
      }
    };
    
    loadData();
  }, []);
  
  useEffect(() => {
    const sleepCheckInterval = setInterval(() => {
      checkSleepRecovery();
    }, 10000);
    
    return () => clearInterval(sleepCheckInterval);
  }, [allCharacters]);

  // ── 60ms movement tick loop ──────────────────────────────────
  useEffect(() => {
    const mgr = movementMgrRef.current;
    let running = true;

    const tick = () => {
      if (!running) return;
      const now = performance.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (mgr.activeCount > 0) {
        const { updates, arrivals } = mgr.update(delta);

        // Batch-update hero positions from movement system
        if (updates.length > 0) {
          setHeroPositions(prev => {
            const next = { ...prev };
            for (const u of updates) {
              const cur = next[u.heroId];
              next[u.heroId] = updateHeroPosition(cur, u.heroId, u.x, u.y, u.isMoving ? 'walk' : 'idle', u.facing);
            }
            return next;
          });
        }

        // Handle arrivals — hero reached their target node
        for (const arrival of arrivals) {
          const targetNodeId = heroTargetNodeRef.current[arrival.heroId];
          if (!targetNodeId) continue;
          delete heroTargetNodeRef.current[arrival.heroId];

          // Complete the assignment: assign hero to node and begin harvesting
          setIslandState(prev => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              nodes: prev.nodes.map(n =>
                n.id === targetNodeId ? { ...n, assignedHeroId: arrival.heroId, lastHarvest: Date.now() } : n
              ),
              assignedHeroes: { ...prev.assignedHeroes, [arrival.heroId]: targetNodeId },
            };
            saveIslandState(prev.id, updated);
            return updated;
          });

          // Set hero to harvesting action
          setHeroPositions(prev => {
            const cur = prev[arrival.heroId];
            if (!cur) return prev;
            return { ...prev, [arrival.heroId]: updateHeroPosition(cur, arrival.heroId, cur.x, cur.y, 'attack') };
          });

          // Trigger first harvest
          setIslandState(prev => {
            if (!prev) return prev;
            const node = prev.nodes.find(n => n.id === targetNodeId);
            if (node) {
              performHarvest({ ...node, assignedHeroId: arrival.heroId });
            }
            return prev;
          });

          const hero = allCharacters.find(c => c.id === arrival.heroId);
          const node = islandState?.nodes.find(n => n.id === targetNodeId);
          if (hero && node) {
            addLog(`${hero.name} arrived at ${node.name} and began harvesting.`);
          }
        }
      }

      movementFrameRef.current = requestAnimationFrame(tick);
    };

    movementFrameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (movementFrameRef.current) cancelAnimationFrame(movementFrameRef.current);
    };
  }, [allCharacters, islandState]);

  // Reload island data after cutscene completes (when accountHomeIsland changes to true)
  useEffect(() => {
    if (accountHomeIsland === true && !islandState && !showCutscene) {
      const loadIslandAfterCutscene = async () => {
        const { getCurrentUser } = await import('@/lib/grudgeBackend');
        const currentUser = getCurrentUser();
        const userId = currentUser?.grudgeId || currentUser?.username || 'guest';
        const activeId = activeCharacter?.id ?? allCharacters[0]?.id ?? null;
        const { state, dto } = await resolveAuthoritativeIsland(userId, activeId);
        setHomeIslandDto(dto);
        setIslandState(state);
        
        const pos: Record<string, HeroPosition> = {};
        const campX = state.campPosition?.x || 50;
        const campY = state.campPosition?.y || 50;
        allCharacters.slice(0, 5).forEach((c, i) => {
          const offsetX = (i % 3) * 3 - 3;
          const offsetY = Math.floor(i / 3) * 3;
          const { x, y } = findNonCollidingPosition(campX + offsetX, campY + offsetY, c.id, pos, state);
          pos[c.id] = createHeroPosition(c.id, x, y, 'idle');
        });
        setHeroPositions(pos);
        
        if (state.mapImageUrl) {
          setMapImageUrl(state.mapImageUrl);
        } else {
          generateIslandMapImage(state.mapStyle, userId);
        }
      };
      loadIslandAfterCutscene();
    }
  }, [accountHomeIsland, islandState, showCutscene, allCharacters]);

  const generateIslandMapImage = async (
    style: IslandState['mapStyle'],
    seed: string,
    stateSnapshot?: IslandState | null,
  ) => {
    setIsGeneratingMap(true);
    const fallback = getIslandMapFallback(style);
    setMapImageUrl((prev) => prev || fallback);

    try {
      // 1. Authoritative home island from Railway (R2 map URL if committed)
      const homeDto = await fetchCurrentHomeIsland().catch(() => null);
      if (homeDto?.mapImageUrl || homeDto?.state?.mapImageUrl) {
        const url = homeDto.mapImageUrl || homeDto.state.mapImageUrl!;
        setMapImageUrl(url);
        setIslandState((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, mapImageUrl: url };
          saveIslandState(prev.id, updated);
          return updated;
        });
        addLog('Loaded committed island map from account.');
        setIsGeneratingMap(false);
        return;
      }
    } catch { /* continue to procedural fallbacks */ }

    try {
      // 2. SVG overhead from nodes, zones, clearings, camp
      const stateForSvg = stateSnapshot ?? islandState ?? createNewIsland(seed);
      const svgUrl = renderIslandMapToDataUrl(islandStateToHomeState(stateForSvg), 1024);
      setMapImageUrl(svgUrl);
      setIslandState((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, mapImageUrl: svgUrl };
        saveIslandState(prev.id, updated);
        return updated;
      });
      addLog('Island overhead map generated.');
    } catch (e) {
      console.warn('SVG map render failed:', e);
    }

    try {
      // 3. Three.js terrain capture (Grudge Studio engine) — upgrades imagery when ready
      const url = await captureIslandTopDown(seed, 1024);
      setMapImageUrl(url);
      setIslandState((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, mapImageUrl: url };
        saveIslandState(prev.id, updated);
        return updated;
      });
      addLog('3D terrain captured for island map.');
    } catch (e) {
      console.warn('Top-down capture failed:', e);
      addLog('Using CDN island backdrop — cultivate and build on your home island.');
    }
    setIsGeneratingMap(false);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 12));
  };
  
  const addActivityLog = (heroName: string, action: string, type: ActivityLogEntry['type'], details?: string) => {
    const entry: ActivityLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      heroName,
      action,
      type,
      details,
    };
    setActivityLog(prev => [entry, ...prev].slice(0, 100));
  };
  
  const showHarvestPopup = (
    screenX: number,
    screenY: number,
    resourceName: string,
    icon: string,
    xpGained: number,
    quantity: number,
    rarity: string
  ) => {
    const popup = {
      id: `popup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      x: screenX,
      y: screenY,
      resourceName,
      icon,
      xpGained,
      quantity,
      rarity,
    };
    setHarvestPopups(prev => [...prev, popup]);
  };
  
  const removeHarvestPopup = (id: string) => {
    setHarvestPopups(prev => prev.filter(p => p.id !== id));
  };
  
  const initializeCharacterStates = (chars: Character[], campX: number, campY: number) => {
    const states: Record<string, CharacterStateData> = {};
    chars.slice(0, 5).forEach((char, i) => {
      const offsetX = (i % 3) * 3 - 3;
      const offsetY = Math.floor(i / 3) * 3;
      states[char.id] = createCharacterState(char.id, campX + offsetX, campY + offsetY);
    });
    setCharacterStates(states);
  };
  
  const updateCharacterStamina = (heroId: string, nodeRarity: string, professionLevel: number) => {
    setCharacterStates(prev => {
      const current = prev[heroId];
      if (!current) return prev;
      
      const updated = consumeStamina(current, nodeRarity, professionLevel);
      
      if (needsSleep(updated.stamina)) {
        const hero = allCharacters.find(c => c.id === heroId);
        if (hero) {
          addActivityLog(hero.name, 'Exhausted! Heading to camp to rest...', 'sleep');
        }
        return {
          ...prev,
          [heroId]: { ...updated, state: 'sleeping' as CharacterActivityState, stateStartTime: Date.now() }
        };
      }
      
      return { ...prev, [heroId]: updated };
    });
  };
  
  const checkSleepRecovery = () => {
    setCharacterStates(prev => {
      const updated = { ...prev };
      let anyWakeUp = false;
      
      for (const [heroId, state] of Object.entries(prev)) {
        if (state.state === 'sleeping') {
          const recovered = recoverStamina(state);
          
          if (isFullyRested(recovered)) {
            const hero = allCharacters.find(c => c.id === heroId);
            if (hero) {
              addActivityLog(hero.name, 'Fully rested and ready to work!', 'wake');
            }
            updated[heroId] = { ...recovered, state: 'idle' as CharacterActivityState };
            anyWakeUp = true;
          } else {
            updated[heroId] = recovered;
          }
        }
      }
      
      return updated;
    });
  };

  const handleNodeClick = async (node: ResourceNode) => {
    const status = getNodeStatus(node);
    
    if (status === 'expired') {
      addLog(`${node.name} has expired. Wait for respawn.`);
      return;
    }

    if (node.assignedHeroId) {
      const assignedHero = allCharacters.find(c => c.id === node.assignedHeroId);
      const characterLevel = assignedHero?.level || 1;
      
      if (canHarvest(node, characterLevel)) {
        await performHarvest(node);
      } else {
        const effectiveInterval = getEffectiveHarvestInterval(node.harvestIntervalMinutes, characterLevel);
        addLog(`${node.name} is being harvested. Next yield in ~${Math.round(effectiveInterval)}m.`);
      }
      return;
    }

    if (!selectedHero) {
      addLog("Select a hero first to assign to this node.");
      return;
    }

    const hero = allCharacters.find(c => c.id === selectedHero);
    if (!hero) return;

    const alreadyAssigned = islandState?.nodes.some(n => n.assignedHeroId === selectedHero);
    if (alreadyAssigned) {
      addLog(`${hero.name} is already assigned to another node.`);
      return;
    }

    // Check if hero is already pathfinding somewhere
    if (movementMgrRef.current.isMoving(selectedHero)) {
      movementMgrRef.current.stopMovement(selectedHero);
      delete heroTargetNodeRef.current[selectedHero];
    }

    const heroPos = heroPositions[selectedHero];
    if (!heroPos) return;

    // A* pathfind from hero position to node
    const grid = tileGridRef.current;
    if (grid) {
      const path = findPath(grid, { x: heroPos.x, y: heroPos.y }, { x: node.x, y: node.y });
      if (path.length > 0) {
        heroTargetNodeRef.current[selectedHero] = node.id;
        movementMgrRef.current.startMovement(selectedHero, path, heroPos.x, heroPos.y);
        setHeroPositions(prev => ({
          ...prev,
          [selectedHero]: updateHeroPosition(prev[selectedHero], selectedHero, heroPos.x, heroPos.y, 'walk'),
        }));
        addLog(`${hero.name} walking to ${node.name}...`);
      } else {
        // Fallback: no path found, teleport near node
        const { x, y } = findNonCollidingPosition(node.x, node.y, selectedHero, heroPositions, islandState);
        setHeroPositions(prev => ({ ...prev, [selectedHero]: createHeroPosition(selectedHero, x, y, 'walk') }));
        // Use legacy setTimeout for fallback
        heroTargetNodeRef.current[selectedHero] = node.id;
        setTimeout(() => {
          // Simulate arrival
          const targetId = heroTargetNodeRef.current[selectedHero];
          if (targetId) {
            delete heroTargetNodeRef.current[selectedHero];
            setIslandState(prev => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                nodes: prev.nodes.map(n =>
                  n.id === targetId ? { ...n, assignedHeroId: selectedHero, lastHarvest: Date.now() } : n
                ),
                assignedHeroes: { ...prev.assignedHeroes, [selectedHero]: targetId },
              };
              saveIslandState(prev.id, updated);
              return updated;
            });
            setHeroPositions(prev => {
              const cur = prev[selectedHero];
              if (!cur) return prev;
              return { ...prev, [selectedHero]: updateHeroPosition(cur, selectedHero, cur.x, cur.y, 'attack') };
            });
            performHarvest({ ...node, assignedHeroId: selectedHero });
          }
        }, 1500);
        addLog(`${hero.name} heading to ${node.name} (no path, teleporting)...`);
      }
    } else {
      // No tile grid yet, use original teleport behavior
      const { x, y } = findNonCollidingPosition(node.x, node.y, selectedHero, heroPositions, islandState);
      setHeroPositions(prev => ({ ...prev, [selectedHero]: createHeroPosition(selectedHero, x, y, 'walk') }));
      setTimeout(() => {
        setIslandState(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            nodes: prev.nodes.map(n =>
              n.id === node.id ? { ...n, assignedHeroId: selectedHero, lastHarvest: Date.now() } : n
            ),
            assignedHeroes: { ...prev.assignedHeroes, [selectedHero]: node.id },
          };
          saveIslandState(prev.id, updated);
          return updated;
        });
        setHeroPositions(prev => {
          const cur = prev[selectedHero];
          if (!cur) return prev;
          return { ...prev, [selectedHero]: updateHeroPosition(cur, selectedHero, cur.x, cur.y, 'attack') };
        });
        performHarvest({ ...node, assignedHeroId: selectedHero });
      }, 1500);
      addLog(`${hero.name} assigned to ${node.name}.`);
    }

    setSelectedHero(null);
  };

  const performHarvest = async (node: ResourceNode) => {
    const hero = allCharacters.find(c => c.id === node.assignedHeroId);
    if (!hero) return;
    
    const heroState = characterStates[hero.id];
    if (heroState?.state === 'sleeping') {
      return;
    }

    const profLevel = ((hero as any).professionLevels?.[node.profession]?.level) || 1;
    const characterLevel = hero.level || 1;
    const bonuses = professionSystem.getGatheringBonuses(profLevel);
    const nodeRarity = node.rarity || 'common';
    
    const currentStamina = heroState?.stamina ?? STAMINA_CONFIG.maxStamina;
    if (!canHarvestWithStamina(currentStamina, nodeRarity, profLevel)) {
      addActivityLog(hero.name, 'Too tired to harvest. Heading to camp to rest...', 'sleep');
      setCharacterStates(prev => ({
        ...prev,
        [hero.id]: { ...prev[hero.id], state: 'sleeping' as CharacterActivityState, stateStartTime: Date.now() }
      }));
      return;
    }
    
    updateCharacterStamina(hero.id, nodeRarity, profLevel);
    
    const gatherSuccess = rollGatherSuccess(profLevel);
    
    if (!gatherSuccess) {
      const successChance = Math.round(getGatherSuccessChance(profLevel) * 100);
      addActivityLog(hero.name, `Failed gather attempt (${successChance}% chance)`, 'harvest', `+5 ${node.profession} XP`);
      
      try {
        const currentProfLevels = (hero as any).professionLevels || {};
        const { updatedLevels } = professionSystem.addProfessionXp(currentProfLevels, node.profession, 5);
        const updatedHero = { ...hero, professionLevels: updatedLevels };
        await CharacterManager.updateCharacter(updatedHero as any);
        setAllCharacters(prev => prev.map(c => c.id === hero.id ? updatedHero : c) as any);
      } catch (e) {}
      
      setIslandState(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          nodes: prev.nodes.map(n => 
            n.id === node.id ? { ...n, lastHarvest: Date.now() } : n
          )
        };
        saveIslandState(prev.id, updated);
        return updated;
      });
      return;
    }
    
    const baseLoot = rollLoot(node.drops, profLevel);
    const loot = baseLoot.map(item => ({
      ...item,
      quantity: item.quantity + bonuses.quantityBonus
    }));
    
    const isCritical = Math.random() < bonuses.criticalGatherChance;
    if (isCritical) {
      loot.forEach(item => item.quantity = Math.floor(item.quantity * 1.5));
    }
    
    const gearDropped = Math.random() < bonuses.gearDropChance;
    if (gearDropped) {
      const gearTier = Math.min(node.tier, bonuses.tierUnlocked);
      loot.push({
        itemId: `gear_drop_t${gearTier}`,
        name: `T${gearTier} Equipment Piece`,
        quantity: 1
      });
    }
    
    const baseXp = professionSystem.getGatherXp(node.type, node.tier);
    const xpGained = Math.floor(baseXp * (1 + bonuses.xpGainBonus));
    
    try {
      const currentProfLevels = (hero as any).professionLevels || {};
      const { updatedLevels, result } = professionSystem.addProfessionXp(currentProfLevels, node.profession, xpGained);
      
      const updatedHero = {
        ...hero,
        xp: (hero.xp || 0) + 5,
        professionLevels: updatedLevels
      };
      await CharacterManager.updateCharacter(updatedHero as any);
      
      setAllCharacters(prev => prev.map(c => c.id === hero.id ? updatedHero : c) as any);
      
      const effectiveInterval = getEffectiveHarvestInterval(node.harvestIntervalMinutes, characterLevel);
      const lootNames = loot.map(l => `${l.quantity}x ${l.name}`).join(", ");
      const criticalText = isCritical ? " ⚡CRIT!" : "";
      const gearText = gearDropped ? " 🎁GEAR!" : "";
      addLog(`${hero.name} harvested: ${lootNames}${criticalText}${gearText} (+${xpGained} XP, next in ${Math.round(effectiveInterval)}m)`);
      addActivityLog(hero.name, `Harvested ${lootNames}${criticalText}${gearText}`, 'harvest', `+${xpGained} ${node.profession} XP`);
      
      setCharacterStates(prev => {
        const current = prev[hero.id];
        if (!current) return prev;
        return {
          ...prev,
          [hero.id]: {
            ...current,
            totalXpEarned: current.totalXpEarned + xpGained,
          }
        };
      });
      
      const heroPos = heroPositions[hero.id];
      if (heroPos && mapContainerRef.current) {
        const screenPos = worldToScreen({ x: heroPos.x, y: heroPos.y }, camera, viewportSize);
        const totalQuantity = loot.reduce((sum, l) => sum + l.quantity, 0);
        showHarvestPopup(
          screenPos.x,
          screenPos.y - 50,
          node.name,
          node.icon,
          xpGained,
          totalQuantity,
          nodeRarity
        );
      }
      
      if (result.leveledUp) {
        toast({
          title: `${node.profession} Level Up!`,
          description: `${hero.name} is now ${node.profession} Level ${result.newLevel}!`,
          className: "bg-amber-900 border-amber-700"
        });
      }

      setIslandState(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          nodes: prev.nodes.map(n => 
            n.id === node.id ? { ...n, lastHarvest: Date.now() } : n
          )
        };
        saveIslandState(prev.id, updated);
        return updated;
      });

      setPendingLoot(prev => [...prev, ...loot]);
      
      try {
        await batchAddResources(loot.map(item => ({ resourceId: item.itemId, amount: item.quantity })));
      } catch (e) {
        console.error('Failed to batch add resources:', e);
      }
    } catch (e) {
      addLog(`${hero.name} gathered from ${node.name}!`);
    }
  };

  const unassignHero = (heroId: string) => {
    const hero = allCharacters.find(c => c.id === heroId);
    if (!hero) return;

    // Stop any active movement
    movementMgrRef.current.stopMovement(heroId);
    delete heroTargetNodeRef.current[heroId];

    setIslandState(prev => {
      if (!prev) return prev;
      const newAssignedHeroes = { ...prev.assignedHeroes };
      delete newAssignedHeroes[heroId];
      
      const updated = {
        ...prev,
        nodes: prev.nodes.map(n => 
          n.assignedHeroId === heroId ? { ...n, assignedHeroId: undefined } : n
        ),
        skinningNodes: (prev.skinningNodes || []).map(n =>
          n.assignedHeroId === heroId ? { ...n, assignedHeroId: undefined } : n
        ),
        assignedHeroes: newAssignedHeroes
      };
      saveIslandState(prev.id, updated);
      return updated;
    });

    // Pathfind hero back to camp
    const campX = islandState?.campPosition?.x || 50;
    const campY = islandState?.campPosition?.y || 50;
    const heroPos = heroPositions[heroId];
    const grid = tileGridRef.current;
    if (heroPos && grid) {
      const path = findPath(grid, { x: heroPos.x, y: heroPos.y }, { x: campX, y: campY });
      if (path.length > 0) {
        movementMgrRef.current.startMovement(heroId, path, heroPos.x, heroPos.y);
        setHeroPositions(prev => ({
          ...prev,
          [heroId]: updateHeroPosition(prev[heroId], heroId, heroPos.x, heroPos.y, 'walk'),
        }));
      } else {
        // Fallback teleport
        setHeroPositions(prev => {
          const { x, y } = findNonCollidingPosition(campX, campY, heroId, prev, islandState);
          return { ...prev, [heroId]: createHeroPosition(heroId, x, y, 'idle') };
        });
      }
    } else {
      setHeroPositions(prev => {
        const { x, y } = findNonCollidingPosition(campX, campY, heroId, prev, islandState);
        return { ...prev, [heroId]: createHeroPosition(heroId, x, y, 'idle') };
      });
    }

    addLog(`${hero.name} returned from gathering.`);
  };

  const refreshNodes = () => {
    if (!islandState) return;
    const newNodes = generateIslandNodes(islandState.id + Date.now());
    setIslandState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, nodes: newNodes, lastUpdate: Date.now() };
      saveIslandState(prev.id, updated);
      return updated;
    });
    addLog("Island resources refreshed!");
  };

  const regenerateMap = async () => {
    if (!islandState || isGeneratingMap) return;
    setMapImageUrl(null);
    clearTopDownCache(islandState.id);
    setIslandState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, mapImageUrl: undefined };
      saveIslandState(prev.id, updated);
      return updated;
    });
    await generateIslandMapImage(islandState.mapStyle, islandState.id, islandState);
  };

  const [, setTick] = useState(0);

  // ── Building placement ────────────────────────────────────────
  const placeBuilding = async (worldX: number, worldY: number) => {
    if (!buildMode) return;
    const result = canPlaceBuilding(buildMode, buildings);
    if (!result.valid) {
      toast({ title: 'Cannot Build', description: result.reason, variant: 'destructive' });
      return;
    }
    const def = BUILDING_DEFS[buildMode];

    // Check if player has enough resources
    const goldNeeded = def.cost.gold || 0;
    const woodNeeded = def.cost.wood || 0;
    const stoneNeeded = def.cost.stone || 0;
    const playerGold = resources['gold'] || resources['GOLD'] || 0;
    const playerWood = resources['WOOD_PINE_T1'] || resources['wood'] || 0;
    const playerStone = resources['STONE_ROUGH'] || resources['stone'] || 0;

    if (playerGold < goldNeeded) {
      toast({ title: 'Not Enough Gold', description: `Need ${goldNeeded}g, have ${playerGold}g`, variant: 'destructive' });
      return;
    }
    if (woodNeeded > 0 && playerWood < woodNeeded) {
      toast({ title: 'Not Enough Wood', description: `Need ${woodNeeded} wood, have ${playerWood}`, variant: 'destructive' });
      return;
    }
    if (stoneNeeded > 0 && playerStone < stoneNeeded) {
      toast({ title: 'Not Enough Stone', description: `Need ${stoneNeeded} stone, have ${playerStone}`, variant: 'destructive' });
      return;
    }

    // Deduct resources from account
    try {
      const deductions: Array<{ resourceId: string; amount: number }> = [];
      if (goldNeeded > 0) deductions.push({ resourceId: 'gold', amount: -goldNeeded });
      if (woodNeeded > 0) deductions.push({ resourceId: 'WOOD_PINE_T1', amount: -woodNeeded });
      if (stoneNeeded > 0) deductions.push({ resourceId: 'STONE_ROUGH', amount: -stoneNeeded });
      // Use the update endpoint to subtract
      const currentResources = { ...resources };
      for (const d of deductions) {
        currentResources[d.resourceId] = Math.max(0, (currentResources[d.resourceId] || 0) + d.amount);
      }
      const { authHeaders } = await import('@/lib/grudgeBackend');
      await fetch('/api/account/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ resources: currentResources }),
      });
      refetchResources();
    } catch (e) {
      console.error('Failed to deduct building resources:', e);
    }

    const tile = worldToTileCoord(worldX, worldY);
    const newBuilding: IslandBuilding = {
      id: `bldg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: buildMode,
      worldX,
      worldY,
      gridX: tile.tx,
      gridY: tile.ty,
      level: 1,
      color: 'Wood',
      builtAt: Date.now(),
    };
    const next = [...buildings, newBuilding];
    setBuildings(next);
    // Persist buildings into island state
    setIslandState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, buildings: next } as any;
      saveIslandState(prev.id, updated);
      return updated;
    });
    addLog(`Built ${def.icon} ${def.name} at (${Math.round(worldX)}, ${Math.round(worldY)})`);
    setBuildMode(null);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (!buildMode || !mapContainerRef.current) return;
    e.stopPropagation();
    const rect = mapContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = screenToWorld({ x: mouseX, y: mouseY }, camera, viewportSize);
    if (world.x < 2 || world.x > 98 || world.y < 2 || world.y > 98) return;
    placeBuilding(world.x, world.y);
  };

  const handleSheepClick = async (animal: Animal) => {
    if (animal.state !== 'alive') return;
    
    const animalType = animal.type || 'hare';
    const animalConfig = ANIMAL_CONFIGS[animalType];
    const animalName = animalConfig.name;
    
    if (!selectedHero) {
      addLog(`Select a hero first to hunt the ${animalName}.`);
      return;
    }
    
    const hero = allCharacters.find(c => c.id === selectedHero);
    if (!hero) return;
    
    setHeroPositions(prev => {
      const { x, y } = findNonCollidingPosition(animal.x, animal.y, selectedHero, prev, islandState);
      return { ...prev, [selectedHero]: createHeroPosition(selectedHero, x, y, 'walk') };
    });
    
    addLog(`${hero.name} is hunting the ${animalName}...`);
    
    setTimeout(() => {
      setHeroPositions(prev => {
        const current = prev[selectedHero];
        if (!current) return prev;
        return { ...prev, [selectedHero]: updateHeroPosition(current, selectedHero, current.x, current.y, 'attack') };
      });
      
      setTimeout(() => {
        const killedAnimal = killAnimal(animal, selectedHero);
        const skinningNode = createSkinningNode(killedAnimal);
        
        setIslandState(prev => {
          if (!prev) return prev;
          const updatedSheep = prev.sheep.filter(s => s.id !== animal.id);
          const updated = {
            ...prev,
            sheep: updatedSheep,
            skinningNodes: [...(prev.skinningNodes || []), skinningNode],
          };
          saveIslandState(prev.id, updated);
          return updated;
        });
        
        setHeroPositions(prev => {
          const current = prev[selectedHero];
          if (!current) return prev;
          return { ...prev, [selectedHero]: updateHeroPosition(current, selectedHero, current.x, current.y, 'idle') };
        });
        
        const rarityText = animalConfig.rarity !== 'common' ? ` (${animalConfig.rarity})` : '';
        addLog(`${hero.name} killed the ${animalName}${rarityText}! Skinning node available for 30 minutes.`);
        toast({
          title: `${animalName} Killed!`,
          description: `A ${animalConfig.rarity} skinning node has appeared. Assign a hero to gather ${animalConfig.rarity} materials.`,
          className: animalConfig.rarity === 'legendary' ? "bg-amber-900 border-amber-500" : 
                     animalConfig.rarity === 'epic' ? "bg-purple-900 border-purple-500" : 
                     animalConfig.rarity === 'rare' ? "bg-blue-900 border-blue-500" : 
                     "bg-amber-900 border-amber-700"
        });
        
        setSelectedHero(null);
      }, 1500);
    }, 1200);
  };

  const handleSkinningNodeClick = async (node: SkinningNode) => {
    if (isSkinningNodeExpired(node)) {
      addLog("This carcass has expired.");
      return;
    }
    
    if (node.assignedHeroId) {
      const hero = allCharacters.find(c => c.id === node.assignedHeroId);
      const characterLevel = hero?.level || 1;
      if (canHarvestSkinningNode(node, characterLevel)) {
        await performSkinningHarvest(node);
      } else {
        addLog(`Still skinning... please wait.`);
      }
      return;
    }
    
    if (!selectedHero) {
      addLog("Select a hero to assign to this carcass.");
      return;
    }
    
    const hero = allCharacters.find(c => c.id === selectedHero);
    if (!hero) return;
    
    setHeroPositions(prev => {
      const { x, y } = findNonCollidingPosition(node.x, node.y, selectedHero, prev, islandState);
      return { ...prev, [selectedHero]: createHeroPosition(selectedHero, x, y, 'attack') };
    });
    
    setIslandState(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        skinningNodes: prev.skinningNodes.map(n => 
          n.id === node.id ? { ...n, assignedHeroId: selectedHero, lastHarvest: Date.now() } : n
        ),
        assignedHeroes: { ...prev.assignedHeroes, [selectedHero]: node.id }
      };
      saveIslandState(prev.id, updated);
      return updated;
    });
    
    addLog(`${hero.name} is skinning the carcass.`);
    setSelectedHero(null);
    performSkinningHarvest({ ...node, assignedHeroId: selectedHero });
  };

  const performSkinningHarvest = async (node: SkinningNode) => {
    const hero = allCharacters.find(c => c.id === node.assignedHeroId);
    if (!hero) return;
    
    const profLevel = ((hero as any).professionLevels?.["Skinning"]?.level) || 1;
    const loot = rollLoot(node.drops, profLevel);
    
    const lootNames = loot.map(l => `${l.quantity}x ${l.name}`).join(", ");
    addLog(`${hero.name} skinned: ${lootNames}`);
    
    setIslandState(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        skinningNodes: prev.skinningNodes.map(n => 
          n.id === node.id ? { ...n, lastHarvest: Date.now() } : n
        )
      };
      saveIslandState(prev.id, updated);
      return updated;
    });
    
    setPendingLoot(prev => [...prev, ...loot]);
    
    try {
      await batchAddResources(loot.map(item => ({ resourceId: item.itemId, amount: item.quantity })));
    } catch (e) {
      console.error('Failed to batch add skinning resources:', e);
    }
  };
  
  useEffect(() => {
    const checkAutoHarvest = async () => {
      if (!islandState) return;
      
      // Reconcile expired nodes in-session (respawn them without regenerating island)
      const reconciled = reconcileExpiredNodes(islandState, Date.now());
      if (reconciled) {
        setIslandState(prev => {
          if (!prev) return prev;
          const updated = { 
            ...prev, 
            nodes: reconciled.updatedNodes, 
            assignedHeroes: reconciled.updatedAssignedHeroes, 
            lastUpdate: Date.now() 
          };
          saveIslandState(prev.id, updated);
          return updated;
        });
        
        // Reset hero positions for freed heroes
        for (const heroId of reconciled.freedHeroIds) {
          setHeroPositions(prev => {
            const { x, y } = findNonCollidingPosition(15, 15, heroId, prev, islandState);
            return {
              ...prev,
              [heroId]: createHeroPosition(heroId, x, y, 'idle')
            };
          });
        }
        
        addLog(`${reconciled.respawnCount} resource node(s) respawned!`);
      }
      
      // Use the latest nodes (reconciled or original)
      const currentNodes = reconciled ? reconciled.updatedNodes : islandState.nodes;
      
      for (const node of currentNodes) {
        if (node.assignedHeroId) {
          const hero = allCharacters.find(c => c.id === node.assignedHeroId);
          const characterLevel = hero?.level || 1;
          
          if (canHarvest(node, characterLevel)) {
            const status = getNodeStatus(node);
            if (status !== 'expired') {
              await performHarvest(node);
            }
          }
        }
      }
      
      const heroesForAuto = allCharacters.slice(0, 5);
      const pendingAssignments: { heroId: string; nodeId: string; node: ResourceNode }[] = [];
      const reservedNodeIds = new Set<string>();
      
      for (const hero of heroesForAuto) {
        if (!heroAutoMode[hero.id]) continue;
        
        // Use currentNodes to check assignments (reflects reconciled state)
        const isAlreadyAssigned = currentNodes.some(n => n.assignedHeroId === hero.id) ||
          (islandState.skinningNodes || []).some(n => n.assignedHeroId === hero.id) ||
          pendingAssignments.some(p => p.heroId === hero.id);
        if (isAlreadyAssigned) continue;
        
        // Skip heroes currently pathfinding to a node
        if (movementMgrRef.current.isMoving(hero.id) || heroTargetNodeRef.current[hero.id]) continue;
        
        const priorities = heroPriorities[hero.id] || ['Mining', 'Logging', 'Herbalism', 'Fishing', 'Skinning'];
        
        for (const profession of priorities) {
          const availableNodes = currentNodes.filter(n => 
            !n.assignedHeroId && 
            !reservedNodeIds.has(n.id) &&
            n.profession === profession && 
            getNodeStatus(n) === 'active'
          );
          
          if (availableNodes.length > 0) {
            const bestNode = availableNodes.sort((a, b) => {
              const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
              return (rarityOrder[a.rarity || 'common'] || 3) - (rarityOrder[b.rarity || 'common'] || 3);
            })[0];
            
            reservedNodeIds.add(bestNode.id);
            pendingAssignments.push({ heroId: hero.id, nodeId: bestNode.id, node: bestNode });
            break;
          }
        }
      }
      
      if (pendingAssignments.length > 0) {
        const grid = tileGridRef.current;
        
        for (const assignment of pendingAssignments) {
          const hero = allCharacters.find(c => c.id === assignment.heroId);
          if (!hero) continue;

          const heroPos = heroPositions[assignment.heroId];
          if (heroPos && grid) {
            const path = findPath(grid, { x: heroPos.x, y: heroPos.y }, { x: assignment.node.x, y: assignment.node.y });
            if (path.length > 0) {
              // Use pathfinding: hero walks to node, arrival triggers assignment + harvest
              heroTargetNodeRef.current[assignment.heroId] = assignment.nodeId;
              movementMgrRef.current.startMovement(assignment.heroId, path, heroPos.x, heroPos.y);
              setHeroPositions(prev => ({
                ...prev,
                [assignment.heroId]: updateHeroPosition(prev[assignment.heroId], assignment.heroId, heroPos.x, heroPos.y, 'walk'),
              }));
              addLog(`[Auto] ${hero.name} walking to ${assignment.node.name} (${assignment.node.rarity || 'common'})`);
              continue;
            }
          }

          // Fallback: instant teleport + assign
          setIslandState(prev => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              nodes: prev.nodes.map(n =>
                n.id === assignment.nodeId ? { ...n, assignedHeroId: assignment.heroId, lastHarvest: Date.now() } : n
              ),
              assignedHeroes: { ...prev.assignedHeroes, [assignment.heroId]: assignment.nodeId },
            };
            saveIslandState(prev.id, updated);
            return updated;
          });
          setHeroPositions(prev => {
            const { x, y } = findNonCollidingPosition(assignment.node.x, assignment.node.y, assignment.heroId, prev, islandState);
            return { ...prev, [assignment.heroId]: createHeroPosition(assignment.heroId, x, y, 'attack') };
          });
          addLog(`[Auto] ${hero.name} assigned to ${assignment.node.name} (${assignment.node.rarity || 'common'})`);
          performHarvest({ ...assignment.node, assignedHeroId: assignment.heroId });
        }
      }
      
      for (const node of (islandState.skinningNodes || [])) {
        if (node.assignedHeroId && !isSkinningNodeExpired(node)) {
          const hero = allCharacters.find(c => c.id === node.assignedHeroId);
          const characterLevel = hero?.level || 1;
          if (canHarvestSkinningNode(node, characterLevel)) {
            await performSkinningHarvest(node);
          }
        }
      }
      
      const expiredSkinning = (islandState.skinningNodes || []).filter(n => isSkinningNodeExpired(n));
      if (expiredSkinning.length > 0) {
        setIslandState(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            skinningNodes: prev.skinningNodes.filter(n => !isSkinningNodeExpired(n))
          };
          saveIslandState(prev.id, updated);
          return updated;
        });
      }
      
      const aliveAnimals = (islandState.sheep || []).filter(s => s.state === 'alive');
      if (aliveAnimals.length < MAX_SHEEP && Math.random() < 0.1) {
        const newAnimal = spawnAnimal(islandState.sheep || []);
        if (newAnimal) {
          const newAnimalConfig = ANIMAL_CONFIGS[newAnimal.type];
          setIslandState(prev => {
            if (!prev) return prev;
            const updated = { ...prev, sheep: [...(prev.sheep || []), newAnimal] };
            saveIslandState(prev.id, updated);
            return updated;
          });
          const rarityText = newAnimalConfig.rarity !== 'common' ? ` (${newAnimalConfig.rarity})` : '';
          addLog(`A ${newAnimalConfig.name}${rarityText} appeared on the island!`);
        }
      }
    };
    
    const interval = setInterval(() => {
      setTick(t => t + 1);
      checkAutoHarvest();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [islandState, allCharacters, heroAutoMode, heroPriorities]);

  const availableHeroes = allCharacters.slice(0, 5);
  const assignedHeroIds = new Set(Object.keys(islandState?.assignedHeroes || {}));

  // Show loading while checking account status
  if (isCheckingStatus) {
    return (
      <GameViewportLayout title="Island">
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-amber-400 mx-auto mb-4" />
            <p className="text-slate-400">Checking island status...</p>
          </div>
        </div>
      </GameViewportLayout>
    );
  }

  // Show cutscene for first visit (account.homeIsland = false)
  if (showCutscene) {
    const cutsceneHero = activeCharacter ?? allCharacters[0] ?? null;
    return (
      <IslandCutscene
        onComplete={handleCutsceneComplete}
        defaultName={cutsceneHero ? `${cutsceneHero.name}'s Haven` : 'Haven Isle'}
        hero={cutsceneHero ? {
          id: cutsceneHero.id,
          raceId: cutsceneHero.raceId,
          classId: cutsceneHero.classId,
          name: cutsceneHero.name,
        } : null}
      />
    );
  }

  const playCharacter = activeCharacter ?? allCharacters[0] ?? null;

  const assignedNodesMap: Record<string, { name: string; icon: string } | undefined> = {};
  availableHeroes.forEach(hero => {
    const node = islandState?.nodes.find(n => n.assignedHeroId === hero.id);
    if (node) {
      assignedNodesMap[hero.id] = { name: node.name, icon: node.icon };
    }
  });

  const island3dSeed = homeIslandDto?.seed ?? islandState?.id ?? islandState?.name ?? 'grudge-island-default';
  const island3dMountainTriad = homeIslandDto?.state?.mountainTriad;
  const island3dRtsHeightmap = homeIslandDto?.state?.rtsHeightmap;
  const island3dRtsNatureScatter = homeIslandDto?.state?.rtsNatureScatter;

  return (
    <GameViewportLayout title="Island">
      {/* 2D / 3D Toggle */}
      <div className="absolute top-2 right-2 z-50 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg p-1 border border-white/10">
        <button
          onClick={() => {
            // Switching from 3D → 2D: sync 3D harvest state back
            if (viewMode === '3d') {
              addLog('[View] Switched to 2D Sprite view');
            }
            setViewMode('2d');
          }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            viewMode === '2d'
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          )}
        >
          <Grid2X2 className="w-3.5 h-3.5" /> 2D Sprite
        </button>
        <button
          onClick={() => {
            // Switching from 2D → 3D: island state carries over via seed
            if (viewMode === '2d') {
              addLog('[View] Switched to 3D World view');
            }
            setViewMode('3d');
          }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            viewMode === '3d'
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          )}
        >
          <Box className="w-3.5 h-3.5" /> 3D World
        </button>
      </div>

      {viewMode === '3d' ? (
        /* ── 3D View ── uses active character race/class for model loading */
        <div className="relative w-full h-full">
          <Island3DRenderer
            seed={island3dSeed}
            characterId={playCharacter?.id}
            raceId={playCharacter?.raceId ?? 'human'}
            classId={playCharacter?.classId ?? 'warrior'}
            quality="high"
            mountainTriad={island3dMountainTriad as MountainTriadSeed | undefined}
            rtsHeightmap={island3dRtsHeightmap as RtsHeightmapPayload | undefined}
            rtsNatureScatter={island3dRtsNatureScatter as RtsNatureScatterPayload | undefined}
            dayNight={{ dayDurationSeconds: 10 * 60 }}
            onDungeonEnter={(dungeonId, dungeonName) => {
              addLog(`Entering ${dungeonName}...`);
              window.location.href = buildHomeDungeonUrl(dungeonId, dungeonName);
            }}
            campPositionPercent={islandState?.campPosition ?? homeIslandDto?.state?.campPosition}
          />
        </div>
      ) : (
      /* ── 2D View ── */
      <div className="relative w-full h-full overflow-hidden">
        <div 
          ref={mapContainerRef}
          className={cn(
            "absolute inset-0 overflow-hidden",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          data-testid="island-map"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleMapClick}
        >
          {/* Island map background — AI image or procedural gradient */}
          <div 
            className="absolute"
            style={{ 
              width: '100%',
              height: '100%',
              left: 0,
              top: 0,
              ...getBackgroundTransform(camera),
            }}
          >
            {/* Ocean base — full screen dark water */}
            <div className="absolute inset-0" style={{ background: '#0a1628' }} />
            {/* AI-generated map — primary visual (full coverage) */}
            {mapImageUrl ? (
              <div className="absolute inset-0" style={{
                backgroundImage: `url(${mapImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                imageRendering: 'pixelated',
              }} />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${getIslandMapFallback(islandState?.mapStyle ?? 'fantasy')})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}

            {/* Terrain zones — harvest biomes + event clearings */}
            {islandState?.terrainZones?.map((zone, i) => (
              <div
                key={`zone-${zone.zone}-${i}`}
                className="absolute pointer-events-none border border-white/5"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  background: TERRAIN_ZONE_COLORS[zone.zone] ?? 'rgba(71, 85, 105, 0.2)',
                  borderRadius: zone.zone === 'clearing' ? '12%' : '4%',
                }}
                title={zone.zone}
              />
            ))}

            {islandState?.clearings?.map((c, i) => (
              <div
                key={`clearing-${i}`}
                className="absolute pointer-events-none border-2 border-dashed border-amber-500/30 rounded-lg"
                style={{
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  width: `${c.width}%`,
                  height: `${c.height}%`,
                  background: 'rgba(245, 158, 11, 0.08)',
                }}
                title="Building clearing"
              />
            ))}

            {islandState?.campPosition && (
              <div
                className="absolute pointer-events-none z-[5] -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${islandState.campPosition.x}%`,
                  top: `${islandState.campPosition.y}%`,
                }}
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/30 border-2 border-amber-400 animate-pulse" />
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-amber-300 font-cinzel whitespace-nowrap">Camp</span>
              </div>
            )}
          </div>
          
          {isGeneratingMap && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
              <div className="text-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
                <p>Generating your unique island...</p>
              </div>
            </div>
          )}

          {/* Entity layer - transforms with camera so entities stay in place */}
          <div 
            className="absolute"
            style={{ 
              width: '100%',
              height: '100%',
              left: 0,
              top: 0,
              ...getBackgroundTransform(camera),
            }}
          >
          {islandState?.nodes.map(node => {
            const status = getNodeStatus(node);
            const timeRemaining = getNodeTimeRemaining(node);
            const assignedHero = node.assignedHeroId ? allCharacters.find(c => c.id === node.assignedHeroId) : null;
            const isExpired = status === 'expired';
            const rarityConfig = NODE_RARITY_CONFIG[node.rarity || 'common'];
            const isLegendary = node.rarity === 'legendary';
            
            const getRarityBorderStyle = () => {
              if (isExpired) return "border-slate-600";
              if (assignedHero) return "border-green-500";
              switch (node.rarity) {
                case 'legendary': return "border-violet-400";
                case 'epic': return "border-purple-500";
                case 'rare': return "border-blue-500";
                default: return "border-slate-500";
              }
            };
            
            const getRarityBgStyle = () => {
              if (isExpired) return "bg-slate-800/80";
              if (assignedHero) return "bg-green-900/90";
              switch (node.rarity) {
                case 'legendary': return "bg-gradient-to-br from-violet-900/90 via-purple-800/90 to-violet-900/90";
                case 'epic': return "bg-purple-900/90";
                case 'rare': return "bg-blue-900/90";
                default: return "bg-slate-800/90";
              }
            };
            
            const getRarityShadow = () => {
              if (isExpired || assignedHero) return "";
              switch (node.rarity) {
                case 'legendary': return "shadow-[0_0_25px_rgba(139,92,246,0.7)] group-hover:shadow-[0_0_40px_rgba(139,92,246,0.9)]";
                case 'epic': return "shadow-[0_0_20px_rgba(168,85,247,0.5)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.7)]";
                case 'rare': return "shadow-[0_0_15px_rgba(59,130,246,0.4)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]";
                default: return "shadow-lg group-hover:shadow-xl";
              }
            };
            
            return (
              <div 
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={`${node.name} - ${node.profession} node (${rarityConfig.name} Lv${node.nodeLevel || 1})`}
                onClick={() => handleNodeClick(node)}
                onKeyDown={(e) => e.key === 'Enter' && handleNodeClick(node)}
                className={cn(
                  "absolute flex flex-col items-center cursor-pointer z-10 group",
                  isExpired ? "opacity-40 grayscale cursor-not-allowed" : "",
                  node.isWaterNode ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "",
                  isLegendary && !isExpired ? "animate-pulse" : ""
                )}
                style={{ 
                  left: `${node.x}%`, 
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                data-testid={`resource-node-${node.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={cn(
                  "relative transition-all duration-200",
                  getRarityShadow()
                )}>
                  <span className="text-lg drop-shadow-md">{node.icon}</span>
                  {assignedHero && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center border border-green-300">
                      <span className="text-[6px] text-white font-bold">{assignedHero.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className={cn(
                  "mt-0.5 px-1 py-0.5 rounded text-[10px] font-bold whitespace-nowrap text-center opacity-0 group-hover:opacity-100 transition-opacity",
                  isExpired 
                    ? "bg-slate-800/90 text-slate-400" 
                    : cn(rarityConfig.bgColor, rarityConfig.textColor)
                )}>
                  {node.name}
                </div>
              </div>
            );
          })}

          {(islandState?.sheep || []).filter(s => s.state === 'alive').map(animal => {
            const animalType = animal.type || 'hare';
            const config = ANIMAL_CONFIGS[animalType];
            const rarityColors = ANIMAL_RARITY_COLORS[config.rarity];
            
            return (
              <motion.div
                key={animal.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute z-10"
                style={{ 
                  left: `${animal.x}%`, 
                  top: `${animal.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                data-testid={`animal-${animal.id}`}
              >
                <AnimalSprite 
                  animalType={animalType}
                  direction={animal.direction}
                  state={animal.state}
                  scale={1}
                  onClick={() => handleSheepClick(animal)}
                  showRarityGlow={true}
                />
              </motion.div>
            );
          })}

          {(islandState?.skinningNodes || []).filter(n => !isSkinningNodeExpired(n)).map(node => {
            const timeRemaining = getSkinningNodeTimeRemaining(node);
            const assignedHero = node.assignedHeroId ? allCharacters.find(c => c.id === node.assignedHeroId) : null;
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            const nodeAnimalType = node.animalType || 'hare';
            const nodeAnimalConfig = ANIMAL_CONFIGS[nodeAnimalType];
            const nodeRarityColors = ANIMAL_RARITY_COLORS[nodeAnimalConfig.rarity];
            
            return (
              <div
                key={node.id}
                onClick={() => handleSkinningNodeClick(node)}
                className="absolute cursor-pointer z-10 group flex flex-col items-center"
                style={{ 
                  left: `${node.x}%`, 
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                data-testid={`skinning-${node.id}`}
              >
                <div className={cn(
                  "relative p-2 rounded-lg border-2 shadow-lg transition-all duration-200",
                  assignedHero
                    ? cn("bg-opacity-90", nodeRarityColors.bg, nodeRarityColors.border, "shadow-[0_0_15px_rgba(239,68,68,0.4)]")
                    : cn("bg-slate-900/90", nodeRarityColors.border, "shadow-[0_0_20px_rgba(239,68,68,0.3)] group-hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]")
                )}>
                  <span className="text-2xl">🦴</span>
                  {assignedHero && (
                    <div className={cn("absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center", nodeRarityColors.bg)}>
                      <span className="text-[8px] text-white font-bold">{assignedHero.name.charAt(0)}</span>
                    </div>
                  )}
                  {nodeAnimalConfig.rarity !== 'common' && (
                    <div className={cn(
                      "absolute -top-1 -left-1 text-[8px] font-bold px-1 rounded",
                      nodeRarityColors.bg, nodeRarityColors.text, "border", nodeRarityColors.border
                    )}>
                      {nodeAnimalConfig.rarity.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={cn(
                  "mt-1 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap text-center border",
                  nodeRarityColors.bg, nodeRarityColors.text, nodeRarityColors.border
                )}>
                  <div>{nodeAnimalConfig.name} Carcass</div>
                  <div className="text-[10px] opacity-80 flex items-center gap-1 justify-center">
                    <Timer className="w-3 h-3" />
                    {minutes}m {seconds}s
                  </div>
                </div>
              </div>
            );
          })}

          {Object.entries(heroPositions).map(([heroId, pos]) => {
            const hero = allCharacters.find(c => c.id === heroId);
            if (!hero) return null;
            
            const race = RACES.find(r => r.id === hero.raceId);
            const cls = CLASSES.find(c => c.id === hero.classId);
            const spriteSet = getSpriteSetForCharacter(hero.raceId, hero.classId);
            const isAssigned = assignedHeroIds.has(heroId);
            const isSelected = selectedHero === heroId;
            
            const assignedNode = islandState?.nodes.find(n => n.assignedHeroId === heroId);
            const isOnWater = assignedNode?.isWaterNode || false;
            
            const heroState = characterStates[heroId];
            const staminaPercent = heroState ? (heroState.stamina / STAMINA_CONFIG.maxStamina) * 100 : 100;
            const staminaColor = staminaPercent > 50 ? 'bg-green-500' : staminaPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';
            
            const getBoatRotation = () => {
              if (!assignedNode) return 0;
              const nodeX = assignedNode.x;
              if (nodeX < 30) return 90;
              if (nodeX > 70) return -90;
              if (pos.y < 50) return 180;
              return 0;
            };
            const boatRotation = getBoatRotation();

            const isPathfinding = movementMgrRef.current.isMoving(heroId);

            return (
              <div
                key={heroId}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAssigned) setSelectedHero(isSelected ? null : heroId);
                }}
                className={cn(
                  "absolute z-20 cursor-pointer group flex flex-col items-center",
                  isSelected && "z-30"
                )}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -100%)',
                  transition: isPathfinding ? 'none' : 'left 0.3s ease, top 0.3s ease',
                }}
                data-testid={`hero-sprite-${heroId}`}
                data-hero-id={heroId}
              >
                {isOnWater && (
                  <div 
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10"
                    style={{ transform: `translateX(-50%) rotate(${boatRotation}deg)` }}
                  >
                    <img 
                      src={assetUrl("/sprites/boats/rowboat.png")} 
                      alt="boat" 
                      className="w-24 h-auto drop-shadow-lg"
                    />
                  </div>
                )}
                {/* Sprite - stands on top of name */}
                <div 
                  className={cn(
                    "scale-150 origin-bottom relative z-20",
                    isOnWater && "overflow-hidden"
                  )}
                  style={isOnWater ? { height: '40px', clipPath: 'inset(0 0 40% 0)' } : {}}
                >
                <SpriteAnimator 
                    spriteSet={spriteSet} 
                    action={pos.action === 'attack' ? 'Attack' : pos.action === 'walk' ? 'Walk' : 'Idle'}
                    flip={pos.facing === 'left'}
                    palette={getCharacterPalette(heroId)}
                    isUndead={hero.raceId === 'undead'}
                  />
                </div>
                {/* Name label below sprite */}
                <div className={cn(
                  "text-[10px] text-center rounded px-1.5 py-0.5 border font-bold shadow-lg whitespace-nowrap z-30 mt-0.5",
                  isSelected
                    ? "bg-amber-900/95 text-amber-100 border-amber-500"
                    : isAssigned 
                      ? "bg-green-900/90 text-green-100 border-green-600"
                      : "bg-black/90 text-white border-slate-600"
                )}>
                  {hero.name}
                </div>
                {/* Stamina bar below name */}
                <div className="w-12 h-1.5 bg-slate-800/80 rounded-full overflow-hidden mt-0.5 border border-slate-600/50">
                  <div 
                    className={cn("h-full transition-all duration-300", staminaColor)}
                    style={{ width: `${staminaPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
          {Object.entries(characterStates).map(([heroId, state]) => {
            if (state.state !== 'sleeping') return null;
            const heroPos = heroPositions[heroId];
            if (!heroPos) return null;
            
            return (
              <SleepingZZZ
                key={`zzz-${heroId}`}
                x={heroPos.x}
                y={heroPos.y - 5}
              />
            );
          })}
          
          {/* Buildings layer — styled icon cards (no CDN sprites needed) */}
          {buildings.map(bldg => {
            const def = BUILDING_DEFS[bldg.type];
            if (!def) return null;
            return (
              <div
                key={bldg.id}
                className="absolute z-5 flex flex-col items-center group cursor-pointer"
                style={{
                  left: `${bldg.worldX}%`,
                  top: `${bldg.worldY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={`${def.name} Lv${bldg.level} — ${def.description}`}
              >
                <div className="w-14 h-14 bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-amber-700/80 rounded-lg shadow-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform group-hover:border-amber-500">
                  {def.icon}
                </div>
                <div className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap bg-slate-900/95 text-amber-300 border border-amber-800 shadow-md">
                  {def.name} <span className="text-slate-500">Lv{bldg.level}</span>
                </div>
              </div>
            );
          })}

          <HarvestPopupManager popups={harvestPopups} onRemovePopup={removeHarvestPopup} />
          </div>
          {/* End entity layer */}

          {/* AI Chat replaces the old tactical card */}
          <IslandChat 
            characters={availableHeroes}
            selectedCharacterId={selectedHero}
            onSelectCharacter={(id) => setSelectedHero(id)}
          />

          <div 
            className="absolute top-4 left-4 cursor-pointer group z-20"
            data-testid="return-to-camp-button"
            onClick={returnAllToCamp}
          >
            <div className="relative">
              <img 
                src={assetUrl(`/sprites/buildings/market/market-level-${marketLevel}.png`)}
                alt={`Market Level ${marketLevel}`}
                className="w-20 h-20 object-contain drop-shadow-lg transition-transform group-hover:scale-110"
                style={{ imageRendering: 'auto' }}
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-900/95 text-amber-100 px-2 py-0.5 rounded border border-amber-600 text-[10px] font-bold whitespace-nowrap shadow-lg group-hover:bg-amber-800 transition-colors">
                <Home className="w-3 h-3 inline mr-1" />
                Return All
              </div>
            </div>
          </div>

          <div className="absolute top-4 left-28 bg-black/70 backdrop-blur-sm text-slate-300 px-3 py-1.5 rounded-lg text-[10px] z-20 border border-white/10 flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={regenerateMap}
              disabled={isGeneratingMap}
              className="text-xs h-5 px-2 text-amber-400 hover:text-amber-300"
              data-testid="regenerate-map-button"
              title="Re-render terrain"
            >
              {isGeneratingMap ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={refreshNodes} 
              className="text-xs h-5 px-2 text-amber-400 hover:text-amber-300"
              data-testid="refresh-nodes-button"
              title="Refresh resource nodes"
            >
              <MapPin className="w-3 h-3" />
            </Button>
            <span className="text-white/20">|</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowBuildMenu(prev => !prev)}
              className={cn("text-xs h-5 px-2", showBuildMenu ? "text-green-400" : "text-amber-400 hover:text-amber-300")}
              data-testid="build-menu-button"
            >
              <Hammer className="w-3 h-3 mr-1" />
              Build
            </Button>
            {buildMode && (
              <Badge className="bg-green-700 text-green-100 text-[9px]">
                Placing: {BUILDING_DEFS[buildMode].icon} {BUILDING_DEFS[buildMode].name}
                <button className="ml-1 hover:text-red-300" onClick={() => setBuildMode(null)}>✕</button>
              </Badge>
            )}
          </div>

          {/* Build Menu Panel */}
          <AnimatePresence>
            {showBuildMenu && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute top-16 left-4 z-30 w-64 max-h-[60vh] overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl"
              >
                <div className="p-3 border-b border-slate-700">
                  <h3 className="text-amber-400 font-bold text-sm flex items-center gap-1">
                    <Hammer className="w-4 h-4" /> Buildings
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click a building then click the map to place it.</p>
                  {/* Player resources */}
                  <div className="mt-2 flex gap-3 text-[10px]">
                    <span className="text-amber-400">🪙 {resources['gold'] || resources['GOLD'] || 0}g</span>
                    <span className="text-green-400">🪵 {resources['WOOD_PINE_T1'] || resources['wood'] || 0}w</span>
                    <span className="text-slate-300">🪨 {resources['STONE_ROUGH'] || resources['stone'] || 0}s</span>
                  </div>
                  {buildings.length > 0 && (
                    <div className="mt-1 text-[10px] text-green-400">
                      Bonuses: {getIslandBonuses(buildings).harvestSpeedMult < 1 ? `Harvest ${Math.round((1 - getIslandBonuses(buildings).harvestSpeedMult) * 100)}% faster` : ''}
                      {getIslandBonuses(buildings).xpMult > 1 ? ` | XP ×${getIslandBonuses(buildings).xpMult.toFixed(2)}` : ''}
                      {getIslandBonuses(buildings).extraHeroSlots > 0 ? ` | +${getIslandBonuses(buildings).extraHeroSlots} hero slots` : ''}
                      {getIslandBonuses(buildings).extraStorage > 0 ? ` | +${getIslandBonuses(buildings).extraStorage} storage` : ''}
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-1">
                  {getAvailableBuildings(buildings).map(({ def, canBuild, reason, currentCount }) => (
                    <button
                      key={def.type}
                      onClick={() => {
                        if (canBuild) {
                          setBuildMode(def.type);
                          setShowBuildMenu(false);
                        } else {
                          toast({ title: 'Cannot Build', description: reason, variant: 'destructive' });
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded text-left transition-colors",
                        canBuild
                          ? "hover:bg-slate-800 cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="text-xl">{def.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          {def.name}
                          <span className="text-[9px] text-slate-400">({currentCount}/{def.maxCount})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{def.description}</div>
                        <div className="text-[9px] text-amber-500">
                          {def.cost.gold}g{def.cost.wood ? ` ${def.cost.wood}w` : ''}{def.cost.stone ? ` ${def.cost.stone}s` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Create Island button — shows when no island state exists or cutscene was skipped */}
        {!islandState && !showCutscene && !isCheckingStatus && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center max-w-md p-8 bg-slate-900/95 rounded-xl border border-amber-700 shadow-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-3xl">🏝️</div>
              <h2 className="text-2xl font-cinzel font-bold text-amber-400 mb-2">Claim Your Island</h2>
              <p className="text-slate-400 text-sm mb-6">Establish your home base in the Grudge Warlords world. Your island will be minted as a cNFT on Solana.</p>
              <Button
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-8 py-3 text-lg"
                onClick={() => setShowCutscene(true)}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Create My Island
              </Button>
            </div>
          </div>
        )}

        {/* Quick create island — top-right button for returning users who somehow skipped setup */}
        {accountHomeIsland === false && !showCutscene && islandState && (
          <div className="absolute top-4 right-4 z-30">
            <Button
              className="bg-amber-600 hover:bg-amber-500 shadow-lg"
              size="sm"
              onClick={() => setShowCutscene(true)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Mint Island cNFT
            </Button>
          </div>
        )}

        {/* Pending Loot Badge - Top Right */}
        {pendingLoot.length > 0 && (
          <div className="absolute top-4 right-4 z-30">
            <Button 
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 shadow-lg"
              onClick={() => { 
                addLog(`Collected ${pendingLoot.length} items!`);
                setPendingLoot([]); 
              }}
              data-testid="collect-loot-button"
            >
              <Package className="w-4 h-4 mr-2" />
              Collect {pendingLoot.length} Items
            </Button>
          </div>
        )}

        {/* RTS-style Hero Command Bar at bottom */}
        <HeroCommandBar
          heroes={availableHeroes}
          selectedHeroId={selectedHero}
          onSelectHero={(id) => setSelectedHero(id)}
          onFocusHero={focusOnHero}
          onSettingsHero={(id) => setSettingsHero(id)}
          onRecallHero={unassignHero}
          characterStates={characterStates}
          assignedHeroIds={assignedHeroIds}
          heroAutoMode={heroAutoMode}
          assignedNodes={assignedNodesMap}
        />

        {/* Communications Panel - Activity Log & Chat */}
        <CommPanel logs={logs} />
      </div>
      )} {/* end 2D/3D ternary */}

      <Dialog open={!!settingsHero} onOpenChange={(open) => !open && setSettingsHero(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400 font-cinzel flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Hero Settings
            </DialogTitle>
          </DialogHeader>
          
          {settingsHero && (() => {
            const hero = allCharacters.find(c => c.id === settingsHero);
            if (!hero) return null;
            const profLevels = (hero as any).professionLevels as Record<string, professionSystem.ProfessionLevel> || {};
            const priorities = heroPriorities[settingsHero] || ['Mining', 'Logging', 'Herbalism', 'Fishing', 'Skinning'];
            const isAutoMode = heroAutoMode[settingsHero] || false;
            
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label htmlFor="auto-mode" className="text-white font-medium">Auto-Harvest Mode</Label>
                    <p className="text-xs text-slate-400">Automatically assign to best available node</p>
                  </div>
                  <Switch 
                    id="auto-mode"
                    checked={isAutoMode}
                    onCheckedChange={(checked) => {
                      setHeroAutoMode(prev => ({ ...prev, [settingsHero]: checked }));
                      if (checked) {
                        addLog(`${hero.name} enabled auto-harvest mode`);
                      }
                    }}
                    data-testid="auto-mode-switch"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Gathering Priorities (drag to reorder)</Label>
                  <p className="text-xs text-slate-400 mb-2">Higher priority professions are assigned first</p>
                  <div className="space-y-1">
                    {priorities.map((prof, index) => {
                      const level = profLevels[prof]?.level || 0;
                      return (
                        <div 
                          key={prof}
                          className="flex items-center gap-2 p-2 bg-slate-800 rounded border border-slate-700"
                          data-testid={`priority-${prof.toLowerCase()}`}
                        >
                          <span className="text-slate-500 text-sm w-4">{index + 1}.</span>
                          <span className="text-lg">{professionSystem.GATHERING_PROFESSION_EMOJIS[prof] || "📦"}</span>
                          <span className="text-white flex-1">{prof}</span>
                          <Badge variant="outline" className="text-xs border-slate-600">
                            Lv{level}
                          </Badge>
                          <div className="flex gap-0.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                              disabled={index === 0}
                              onClick={() => {
                                const newPriorities = [...priorities];
                                [newPriorities[index - 1], newPriorities[index]] = [newPriorities[index], newPriorities[index - 1]];
                                setHeroPriorities(prev => ({ ...prev, [settingsHero]: newPriorities }));
                              }}
                            >
                              ↑
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                              disabled={index === priorities.length - 1}
                              onClick={() => {
                                const newPriorities = [...priorities];
                                [newPriorities[index], newPriorities[index + 1]] = [newPriorities[index + 1], newPriorities[index]];
                                setHeroPriorities(prev => ({ ...prev, [settingsHero]: newPriorities }));
                              }}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700">
                  <Link href={`/character/${settingsHero}`}>
                    <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-800" onClick={() => setSettingsHero(null)}>
                      View Full Character Profile
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })()}
          
          <DialogFooter>
            <Button onClick={() => setSettingsHero(null)} className="bg-amber-600 hover:bg-amber-500">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GameViewportLayout>
  );
}
