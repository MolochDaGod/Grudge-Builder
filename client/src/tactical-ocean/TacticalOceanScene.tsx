import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeWorldMapManager, CameraMode, Island3D, WindState } from '@/tactical-ocean/threeWorldMapManager';
import { LEGACY_SECTOR_IDS, LEGACY_TO_ZONE_ID } from '@shared/definitions/sectorBridge';
import { getSectorById } from '@shared/definitions/worldMapSectors';
import { OCEAN_SECTOR_POSITIONS } from '@/lib/oceanNavigation';
import { ensureStarterShip, getActiveShip } from '@/lib/shipDockService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Camera, Crosshair, Heart, Coins, Anchor, Fish, Swords, Wind, Wrench, Navigation } from 'lucide-react';

interface TacticalOceanSceneProps {
  onBackToMenu: () => void;
  /** sector id — legacy (NW) or zone (haven_shore) */
  onLandOnIsland?: (sectorId: string, islandName: string) => void;
}

interface AbilityState {
  id: string;
  name: string;
  cooldown: number;
  maxCooldown: number;
  key: string;
}

interface HUDState {
  playerHealth: number;
  playerMaxHealth: number;
  gold: number;
  combatXP: number;
  fishingXP: number;
  cannonCooldown: number;
  nearbyIsland: Island3D | null;
  canLand: boolean;
  combatTimer: number;
  wind: WindState;
  sailAngle: number;
  speedMultiplier: number;
  isAiming: boolean;
  abilities: AbilityState[];
  sailsDeployed: boolean;
  inNoSailZone: boolean;
  windAngleDegrees: number;
  weather: string;
  timeOfDay: number;
}

interface MutableGameState {
  playerPosition: THREE.Vector3;
  playerRotation: number;
  playerHealth: number;
  gold: number;
  combatXP: number;
  fishingXP: number;
  cannonCooldown: number;
  combatTimer: number;
  repairCooldown: number;
  sailsDeployed: boolean;
}

const INITIAL_ABILITIES: AbilityState[] = [
  { id: 'repair', name: 'Repair', cooldown: 0, maxCooldown: 120, key: '1' },
  { id: 'windmagic', name: 'Wind Magic', cooldown: 0, maxCooldown: 60, key: '2' },
  { id: 'shield', name: 'Hull Shield', cooldown: 0, maxCooldown: 90, key: '3' },
  { id: 'multishot', name: 'Multi-Shot', cooldown: 0, maxCooldown: 45, key: '4' },
  { id: 'special', name: 'Special', cooldown: 0, maxCooldown: 180, key: '5' },
];

const INITIAL_HUD_STATE: HUDState = {
  playerHealth: 100,
  playerMaxHealth: 100,
  gold: 100,
  combatXP: 0,
  fishingXP: 0,
  cannonCooldown: 0,
  nearbyIsland: null,
  canLand: false,
  combatTimer: 0,
  wind: { direction: 0, speed: 15, gustFactor: 1 },
  sailAngle: 0,
  speedMultiplier: 1,
  isAiming: false,
  abilities: INITIAL_ABILITIES,
  sailsDeployed: false,
  inNoSailZone: false,
  windAngleDegrees: 0,
  weather: 'clear',
  timeOfDay: 0.3
};

const HUD_UPDATE_INTERVAL = 100;

const PIRATE_NAMES = [
  'Blackbeard', 'Anne Bonny', 'Calico Jack', 'William Kidd', 'Henry Morgan',
  'Mary Read', 'Black Bart', 'Long John Silver', 'Captain Hook', 'Jack Sparrow'
];

const BIOME_MAP: Record<string, string> = {
  frozen: 'arctic',
  storm: 'haunted',
  forest: 'tropical',
  desert: 'desert',
  ethereal: 'haunted',
  volcanic: 'volcanic',
  abyssal: 'haunted',
  nexus: 'tropical',
  tropical: 'tropical',
};

export function TacticalOceanScene({ onBackToMenu, onLandOnIsland }: TacticalOceanSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<ThreeWorldMapManager | null>(null);
  const animationRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const lastHUDUpdateRef = useRef<number>(0);
  
  const mutableStateRef = useRef<MutableGameState>({
    playerPosition: new THREE.Vector3(OCEAN_SECTOR_POSITIONS.S.x, 0, OCEAN_SECTOR_POSITIONS.S.z),
    playerRotation: 0,
    playerHealth: 100,
    gold: 100,
    combatXP: 0,
    fishingXP: 0,
    cannonCooldown: 0,
    combatTimer: 0,
    repairCooldown: 0,
    sailsDeployed: false
  });
  
  const abilityCooldownsRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [hudState, setHUDState] = useState<HUDState>(INITIAL_HUD_STATE);
  const [cameraMode, setCameraMode] = useState<CameraMode>('third-person');
  const [isPaused, setIsPaused] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const manager = new ThreeWorldMapManager();
    managerRef.current = manager;
    manager.mount(containerRef.current);
    
    const spawn = OCEAN_SECTOR_POSITIONS.S;
    const playerPos = new THREE.Vector3(spawn.x, 0, spawn.z);
    const oceanAccount = sessionStorage.getItem('grudge-ocean-account') ?? 'guest';
    ensureStarterShip(oceanAccount, null);
    const activeShip = getActiveShip(oceanAccount);
    manager.createPlayerShipFromCatalog(
      'player',
      playerPos,
      activeShip?.name ?? 'Captain',
      activeShip?.size ?? 'rowboat',
    );

    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 1200 + Math.random() * 2400;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const name = PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)];
      const level = Math.floor(Math.random() * 5) + 1;
      manager.createNPCShip(`npc-${i}`, new THREE.Vector3(x, 0, z), name, level);
    }

    for (const legacyId of LEGACY_SECTOR_IDS) {
      const anchor = OCEAN_SECTOR_POSITIONS[legacyId];
      const zone = getSectorById(LEGACY_TO_ZONE_ID[legacyId]);
      const name = zone?.name ?? legacyId;
      const biome = BIOME_MAP[zone?.biome ?? 'tropical'] ?? 'tropical';
      manager.createIsland(
        legacyId,
        new THREE.Vector3(anchor.x, 0, anchor.z),
        anchor.radius,
        name,
        biome,
      );
    }
    
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * 800;
      const z = (Math.random() - 0.5) * 800;
      const value = Math.floor(Math.random() * 50) + 10;
      manager.createTreasure(`treasure-${i}`, new THREE.Vector3(x, 0, z), value);
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      manager.dispose();
      managerRef.current = null;
    };
  }, []);
  
  const gameLoop = useCallback(() => {
    const manager = managerRef.current;
    if (!manager || isPaused) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    const delta = manager.update();
    const state = mutableStateRef.current;
    const keys = keysRef.current;
    const now = performance.now();
    
    manager.updateWind(delta);
    manager.updateWindMagic(delta);
    manager.updateSailVisuals();
    
    if (keys.has('q')) {
      manager.adjustSailAngle(-1.5 * delta);
    }
    if (keys.has('e')) {
      manager.adjustSailAngle(1.5 * delta);
    }
    
    const rotationSpeed = 2.5 * delta;
    
    // A/D or Arrow Left/Right: Rotate ship
    if (keys.has('a') || keys.has('arrowleft')) {
      state.playerRotation += rotationSpeed;
    }
    if (keys.has('d') || keys.has('arrowright')) {
      state.playerRotation -= rotationSpeed;
    }
    
    // Valheim-style sailing: Movement based on wind, not key presses
    // W = deploy sails (toggle handled in key handler)
    // S = retract sails (toggle handled in key handler)
    const windEffect = manager.calculateWindEffect(state.playerRotation, state.sailsDeployed);
    
    // Calculate movement from wind
    const windMovement = manager.calculateWindMovement(state.playerRotation, state.sailsDeployed, delta);
    
    // Apply movement
    state.playerPosition.x += windMovement.x;
    state.playerPosition.z += windMovement.z;
    
    // Clamp to world bounds
    const worldHalf = 4400;  // Slightly less than half of 9000
    state.playerPosition.x = Math.max(-worldHalf, Math.min(worldHalf, state.playerPosition.x));
    state.playerPosition.z = Math.max(-worldHalf, Math.min(worldHalf, state.playerPosition.z));
    
    const velocity = new THREE.Vector3(
      windMovement.x / delta,
      0,
      windMovement.z / delta
    );
    
    manager.updatePlayerShip(state.playerPosition, state.playerRotation, velocity, state.playerHealth);
    
    if (manager.isAiming() && containerRef.current) {
      manager.updateAiming(
        mousePosRef.current.x,
        mousePosRef.current.y,
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    }
    
    manager.getNPCShips().forEach((ship, id) => {
      const dx = state.playerPosition.x - ship.position.x;
      const dz = state.playerPosition.z - ship.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      let targetRotation = ship.rotation;
      let speed = 8 * delta;
      
      if (dist < 150 && dist > 30) {
        targetRotation = Math.atan2(dx, dz);
      } else if (dist <= 30) {
        speed = 0;
      } else {
        targetRotation += 0.3 * delta;
      }
      
      ship.position.x += Math.sin(targetRotation) * speed;
      ship.position.z += Math.cos(targetRotation) * speed;
      
      manager.updateNPCShip(id, ship.position, targetRotation, ship.health);
      
      if (dist < 80 && dist > 20 && Math.random() < 0.005) {
        const fireDir = new THREE.Vector3(dx, 2, dz).normalize().multiplyScalar(120);
        manager.createCannonball(
          `npc-ball-${Date.now()}-${id}`,
          new THREE.Vector3(ship.position.x, 3, ship.position.z),
          fireDir,
          id,
          10
        );
      }
    });
    
    const { shipHits, treasureCollects } = manager.checkCollisions();
    
    state.combatTimer = Math.max(0, state.combatTimer - delta);
    state.cannonCooldown = Math.max(0, state.cannonCooldown - delta);
    state.repairCooldown = Math.max(0, state.repairCooldown - delta);
    
    for (let i = 0; i < abilityCooldownsRef.current.length; i++) {
      abilityCooldownsRef.current[i] = Math.max(0, abilityCooldownsRef.current[i] - delta);
    }
    
    shipHits.forEach(hit => {
      if (hit.targetId === 'player') {
        state.playerHealth = Math.max(0, state.playerHealth - hit.damage);
        state.combatTimer = 15;
      } else {
        const ship = manager.getNPCShips().get(hit.targetId);
        if (ship) {
          ship.health -= hit.damage;
          state.combatTimer = 15;
          if (ship.health <= 0) {
            state.gold += 20 + ship.level * 10;
            state.combatXP += ship.level * 25;
            manager.removeNPCShip(hit.targetId);
          }
        }
      }
    });
    
    treasureCollects.forEach(id => {
      manager.collectTreasure(id);
      state.gold += 25;
    });
    
    if (now - lastHUDUpdateRef.current >= HUD_UPDATE_INTERVAL) {
      lastHUDUpdateRef.current = now;
      
      let nearbyIsland: Island3D | null = null;
      manager.getIslands().forEach(island => {
        const dist = Math.sqrt(
          Math.pow(state.playerPosition.x - island.position.x, 2) +
          Math.pow(state.playerPosition.z - island.position.z, 2)
        );
        if (dist < island.radius + 20) {
          nearbyIsland = island;
        }
      });
      
      const updatedAbilities = INITIAL_ABILITIES.map((ability, i) => ({
        ...ability,
        cooldown: abilityCooldownsRef.current[i]
      }));
      
      setHUDState({
        playerHealth: state.playerHealth,
        playerMaxHealth: 100,
        gold: state.gold,
        combatXP: state.combatXP,
        fishingXP: state.fishingXP,
        cannonCooldown: state.cannonCooldown,
        nearbyIsland,
        canLand: nearbyIsland !== null && state.combatTimer <= 0,
        combatTimer: state.combatTimer,
        wind: manager.getWindState(),
        sailAngle: manager.getSailAngle(),
        speedMultiplier: windEffect.speedMultiplier,
        isAiming: manager.isAiming(),
        abilities: updatedAbilities,
        sailsDeployed: state.sailsDeployed,
        inNoSailZone: windEffect.inNoSailZone,
        windAngleDegrees: windEffect.windAngleDegrees,
        weather: manager.getWeatherState(),
        timeOfDay: manager.getTimeOfDay()
      });
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [isPaused]);
  
  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameLoop]);
  
  const fireCannon = useCallback((velocity?: THREE.Vector3) => {
    const manager = managerRef.current;
    const state = mutableStateRef.current;
    if (!manager || state.cannonCooldown > 0) return;
    
    const playerShip = manager.getPlayerShip();
    if (!playerShip) return;
    
    const firePos = new THREE.Vector3(
      state.playerPosition.x,
      4,
      state.playerPosition.z
    );
    
    const fireDir = velocity || new THREE.Vector3(
      Math.sin(state.playerRotation),
      0.3,
      Math.cos(state.playerRotation)
    ).normalize().multiplyScalar(180);
    
    manager.createCannonball(
      `player-ball-${Date.now()}`,
      firePos,
      fireDir,
      'player',
      25
    );
    
    state.cannonCooldown = 1.5;
  }, []);
  
  const useRepairAbility = useCallback(() => {
    const state = mutableStateRef.current;
    if (abilityCooldownsRef.current[0] > 0) return;
    if (state.playerHealth >= 100) return;
    
    state.playerHealth = Math.min(100, state.playerHealth + 20);
    abilityCooldownsRef.current[0] = 120;
  }, []);

  const useWindMagic = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    if (abilityCooldownsRef.current[1] > 0) return;
    
    const activated = manager.activateWindMagic();
    if (activated) {
      abilityCooldownsRef.current[1] = 60; // 60 second cooldown
      mutableStateRef.current.sailsDeployed = true; // Ensure sails deployed
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    keysRef.current.add(key);
    
    if (key === 'f1') {
      setCameraMode('third-person');
      managerRef.current?.setCameraMode('third-person');
    } else if (key === 'f2') {
      setCameraMode('birds-eye');
      managerRef.current?.setCameraMode('birds-eye');
    } else if (key === ' ') {
      e.preventDefault();
      if (mutableStateRef.current.cannonCooldown <= 0) {
        fireCannon();
      }
    } else if (key === '1') {
      useRepairAbility();
    } else if (key === '2') {
      useWindMagic();
    } else if (key === 'escape') {
      setIsPaused(p => !p);
    } else if (key === 'w' || key === 'arrowup') {
      // Valheim-style: W deploys sails to catch wind
      mutableStateRef.current.sailsDeployed = true;
      // Set sail position to deployed (2) unless wind magic active
      if (!managerRef.current?.isWindMagicActive()) {
        managerRef.current?.setSailPosition(2);
      }
    } else if (key === 's' || key === 'arrowdown') {
      // Valheim-style: S retracts sails to stop
      mutableStateRef.current.sailsDeployed = false;
      // Set sail position to furled (0)
      managerRef.current?.setSailPosition(0);
    }
  }, [fireCannon, useRepairAbility, useWindMagic]);
  
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase());
  }, []);
  
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      managerRef.current?.startAiming();
    }
  }, []);
  
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 2) {
      const velocity = managerRef.current?.stopAiming(true);
      if (velocity && mutableStateRef.current.cannonCooldown <= 0) {
        fireCannon(velocity);
      }
    }
  }, [fireCannon]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  }, []);
  
  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault();
  }, []);
  
  useEffect(() => {
    const container = containerRef.current;
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    if (container) {
      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('contextmenu', handleContextMenu);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (container) {
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [handleKeyDown, handleKeyUp, handleMouseDown, handleMouseUp, handleMouseMove, handleContextMenu]);
  
  const healthPercent = (hudState.playerHealth / hudState.playerMaxHealth) * 100;
  const healthColor = healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';
  
  const windDirectionDeg = (hudState.wind.direction * 180 / Math.PI) + 180;
  const sailAngleDeg = hudState.sailAngle * 180 / Math.PI;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">
      <div 
        ref={containerRef} 
        className="w-full h-full"
        data-testid="canvas-world-map-3d"
      />
      
      <Card className="absolute top-4 left-4 p-4 bg-background/90 backdrop-blur-sm" data-testid="panel-hud-3d">
        <div className="flex items-center gap-2 mb-2">
          <Anchor className="w-5 h-5 text-primary" />
          <span className="font-serif font-bold">Captain</span>
          <Badge variant="secondary">Lv.1</Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${healthColor} transition-all`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
            <span className="text-xs">{hudState.playerHealth}/{hudState.playerMaxHealth}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span>{hudState.gold}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            <span>Combat XP: {hudState.combatXP}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Fish className="w-4 h-4 text-blue-400" />
            <span>Fishing XP: {hudState.fishingXP}</span>
          </div>
          
          {hudState.cannonCooldown > 0 && (
            <div className="text-orange-400">Reloading...</div>
          )}
          
          {hudState.combatTimer > 0 && (
            <div className="text-red-400">In Combat ({Math.ceil(hudState.combatTimer)}s)</div>
          )}
        </div>
      </Card>
      
      <Card className="absolute bottom-24 left-4 p-3 bg-background/90 backdrop-blur-sm" data-testid="panel-wind">
        <div className="text-sm font-bold mb-2 flex items-center gap-2">
          <Wind className="w-4 h-4" />
          Wind & Sailing
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-muted rounded-full" />
            <div 
              className="absolute top-1/2 left-1/2 w-1 h-6 bg-blue-400 origin-bottom"
              style={{ 
                transform: `translate(-50%, -100%) rotate(${windDirectionDeg}deg)`,
                transformOrigin: 'bottom center'
              }}
            />
            <div 
              className="absolute top-1/2 left-1/2 w-1 h-5 bg-amber-400 origin-bottom"
              style={{ 
                transform: `translate(-50%, -100%) rotate(${sailAngleDeg}deg)`,
                transformOrigin: 'bottom center'
              }}
            />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">N</div>
          </div>
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
              <span>Wind</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              <span>Sail</span>
            </div>
            <div className="mt-1 font-semibold">
              {hudState.sailsDeployed ? (
                <>Speed: {(hudState.speedMultiplier * 100).toFixed(0)}%</>
              ) : (
                <span className="text-orange-400">Sails Furled</span>
              )}
            </div>
            {hudState.inNoSailZone && hudState.sailsDeployed && (
              <div className="text-red-400 font-semibold">No-Sail Zone!</div>
            )}
            <div className="text-muted-foreground">
              Wind Angle: {hudState.windAngleDegrees.toFixed(0)}°
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span>Weather:</span>
            <span className={
              hudState.weather === 'stormy' ? 'text-purple-400' :
              hudState.weather === 'foggy' ? 'text-gray-400' :
              hudState.weather === 'cloudy' ? 'text-blue-300' : 'text-yellow-400'
            }>
              {hudState.weather.charAt(0).toUpperCase() + hudState.weather.slice(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Time:</span>
            <span>
              {hudState.timeOfDay < 0.25 ? 'Night' :
               hudState.timeOfDay < 0.35 ? 'Dawn' :
               hudState.timeOfDay < 0.65 ? 'Day' :
               hudState.timeOfDay < 0.75 ? 'Dusk' : 'Night'}
            </span>
          </div>
        </div>
      </Card>
      
      <Card className="absolute top-4 right-4 p-3 bg-background/90 backdrop-blur-sm" data-testid="panel-controls-3d">
        <div className="text-sm space-y-1">
          <div className="font-bold mb-2">Sailing Controls</div>
          <div>W - Deploy Sails</div>
          <div>S - Furl Sails (Stop)</div>
          <div>A/D - Turn Left/Right</div>
          <div>Q/E - Trim Sail Angle</div>
          <div className="pt-2 border-t border-border mt-2">
            <div className="font-bold mb-1">Combat</div>
            <div>Space - Fire Cannon</div>
            <div>Right-Click - Aim</div>
            <div>1 - Repair</div>
          </div>
          <div className="pt-2 border-t border-border mt-2 text-xs text-muted-foreground">
            <div>Best speed: 90-135° from wind</div>
            <div>No-sail zone: 0-45° into wind</div>
          </div>
        </div>
      </Card>
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
        <Button
          variant={cameraMode === 'third-person' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setCameraMode('third-person');
            managerRef.current?.setCameraMode('third-person');
          }}
          data-testid="button-camera-third-person"
        >
          <Camera className="w-4 h-4 mr-1" />
          Third Person
        </Button>
        <Button
          variant={cameraMode === 'birds-eye' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setCameraMode('birds-eye');
            managerRef.current?.setCameraMode('birds-eye');
          }}
          data-testid="button-camera-birds-eye"
        >
          <Eye className="w-4 h-4 mr-1" />
          Bird's Eye
        </Button>
      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" data-testid="panel-abilities">
        <Card className="p-2 bg-background/90 backdrop-blur-sm flex gap-1">
          {hudState.abilities.map((ability, i) => {
            const isOnCooldown = ability.cooldown > 0;
            const cooldownPercent = isOnCooldown ? (ability.cooldown / ability.maxCooldown) * 100 : 0;
            
            return (
              <div 
                key={ability.id}
                className="relative w-12 h-12 rounded-md border border-border bg-muted/50 flex items-center justify-center"
                title={`${ability.name} (${ability.key})`}
              >
                <span className="text-xs font-bold text-muted-foreground absolute top-0.5 left-1">{ability.key}</span>
                {ability.id === 'repair' && <Wrench className="w-5 h-5" />}
                {ability.id === 'boost' && <Navigation className="w-5 h-5" />}
                {ability.id === 'multishot' && <Crosshair className="w-5 h-5" />}
                {(ability.id === 'shield' || ability.id === 'special') && (
                  <span className="text-xs text-muted-foreground">...</span>
                )}
                {isOnCooldown && (
                  <div 
                    className="absolute inset-0 bg-black/60 rounded-md flex items-center justify-center"
                  >
                    <span className="text-xs font-bold">{Math.ceil(ability.cooldown)}s</span>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
      
      <Button
        onClick={onBackToMenu}
        variant="outline"
        className="absolute top-20 left-4"
        data-testid="button-back-menu-worldmap-3d"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Menu
      </Button>
      
      {hudState.canLand && hudState.nearbyIsland && (
        <Button
          onClick={() => onLandOnIsland?.(hudState.nearbyIsland!.id, hudState.nearbyIsland!.name)}
          size="lg"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-700"
          data-testid="button-land-island-3d"
        >
          <Anchor className="w-5 h-5 mr-2" />
          Land on {hudState.nearbyIsland.name}
        </Button>
      )}
      
      {hudState.isAiming && (
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <Badge variant="secondary" className="text-blue-400">
            <Crosshair className="w-4 h-4 mr-1" />
            Aiming
          </Badge>
        </div>
      )}
      
      {isPaused && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-serif font-bold mb-4">Paused</h2>
            <p className="text-muted-foreground mb-4">Press ESC to resume</p>
            <Button onClick={() => setIsPaused(false)} data-testid="button-resume">Resume</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
