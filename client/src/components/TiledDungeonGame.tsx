import { useState, useEffect, useRef, useCallback } from 'react';
import { MiniWorldRenderer } from './MiniWorldRenderer';
import { AbilityBar } from './AbilityBar';
import { 
  SCALED_TILE_SIZE
} from '@/lib/dungeonTileset';
import {
  getMonsterMiniWorldSprite,
  getHeroMiniWorldSprite
} from '@/lib/dungeonSpriteConfig';
import { 
  TilemapDungeon, 
  TilemapEntity, 
  convertToTilemap, 
  updateVisibility,
  moveEntity,
  updateEntityPhysics
} from '@/lib/dungeonTilemapConverter';
import { loadSpecialDungeon, isSpecialDungeon, LoadedMap } from '@/lib/tiledMapLoader';
import { generateDungeon, computeFOV } from '@/lib/dungeonGenerator';
import type { GeneratedDungeon, DungeonEntity } from '@/lib/dungeonGenerator';
import type { Direction, AnimationState } from '@/lib/dungeonSpriteConfig';
import { DUNGEON_FLOORS } from '@shared/definitions';
import { Progress } from '@/components/ui/progress';
import { Heart, Zap, Sword, Shield, MapPin } from 'lucide-react';
import {
  AbilityBarState,
  RuntimeAbility,
  createDefaultAbilityBar
} from '@/lib/abilitySystem';

interface TiledDungeonGameProps {
  floorId: string;
  playerSpriteId?: string;
  characterName: string;
  characterClass?: string;
  characterStats: {
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    attack: number;
    defense: number;
    criticalChance?: number;
    criticalFactor?: number;
    blockChance?: number;
  };
  onExit?: () => void;
  onVictory?: () => void;
  onDefeat?: () => void;
}

const VIEWPORT_WIDTH = 544;
const VIEWPORT_HEIGHT = 384;
const FOV_RADIUS = 8;

export function TiledDungeonGame({
  floorId,
  playerSpriteId = 'dungeon_hero',
  characterName,
  characterClass = 'warrior',
  characterStats,
  onExit,
  onVictory,
  onDefeat
}: TiledDungeonGameProps) {
  const [tilemap, setTilemap] = useState<TilemapDungeon | null>(null);
  const [player, setPlayer] = useState<TilemapEntity | null>(null);
  const [dungeonRef, setDungeonRef] = useState<GeneratedDungeon | null>(null);
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [currentHp, setCurrentHp] = useState(characterStats.hp);
  const [currentMana, setCurrentMana] = useState(characterStats.mana);
  const [currentStamina, setCurrentStamina] = useState(100);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'victory' | 'defeat'>('loading');
  const [abilityBarState, setAbilityBarState] = useState<AbilityBarState>(() => createDefaultAbilityBar());
  
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((msg: string) => {
    setEventLog(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const handleAbilityActivated = useCallback((ability: RuntimeAbility, slotIndex: number) => {
    if (!player || !tilemap) return;

    if (ability.resourceType === 'mana') {
      setCurrentMana(prev => Math.max(0, prev - ability.resourceCost));
    } else if (ability.resourceType === 'stamina') {
      setCurrentStamina(prev => Math.max(0, prev - ability.resourceCost));
    }

    const nearbyMonster = tilemap.entities.find(e => {
      if (e.type !== 'monster' || !e.hp || e.hp <= 0) return false;
      const dx = Math.abs(e.tileX - player.tileX);
      const dy = Math.abs(e.tileY - player.tileY);
      return dx <= ability.range && dy <= ability.range && (dx + dy) <= ability.range;
    });

    if (nearbyMonster) {
      const damage = Math.max(1, ability.baseDamage + Math.floor(characterStats.attack * (ability.damageMultiplier / 100)));
      const isCrit = Math.random() < (characterStats.criticalChance || 0.05);
      const finalDamage = isCrit ? Math.floor(damage * (characterStats.criticalFactor || 1.5)) : damage;

      nearbyMonster.hp = Math.max(0, (nearbyMonster.hp || 0) - finalDamage);
      
      addLog(`${ability.name} ${isCrit ? 'CRIT' : 'hits'} ${nearbyMonster.data?.name || 'enemy'} for ${finalDamage} damage!`);
      
      if (nearbyMonster.hp <= 0) {
        addLog(`${nearbyMonster.data?.name || 'Enemy'} defeated!`);
        const remainingMonsters = tilemap.entities.filter(e => e.type === 'monster' && e.hp && e.hp > 0);
        if (remainingMonsters.length === 0) {
          setGameState('victory');
          addLog('All enemies defeated! Victory!');
        }
      }
      
      setTilemap({ ...tilemap });
    } else {
      addLog(`${ability.name} used! (No target in range)`);
    }
  }, [player, tilemap, characterStats, addLog]);

  useEffect(() => {
    const initDungeon = async () => {
      let dungeon: GeneratedDungeon;
      
      if (isSpecialDungeon(floorId)) {
        const specialMap = await loadSpecialDungeon(floorId);
        if (specialMap) {
          dungeon = convertSpecialMapToDungeon(specialMap);
        } else {
          dungeon = generateDungeon(floorId);
        }
      } else {
        dungeon = generateDungeon(floorId);
      }
      
      setDungeonRef(dungeon);
      computeFOV(dungeon, dungeon.entrance.x, dungeon.entrance.y, FOV_RADIUS);
      
      const tm = convertToTilemap(dungeon);
      setTilemap(tm);
      
      const playerEntity: TilemapEntity = {
        id: 'player',
        type: 'player',
        tileX: dungeon.entrance.x,
        tileY: dungeon.entrance.y,
        pixelX: dungeon.entrance.x * SCALED_TILE_SIZE,
        pixelY: dungeon.entrance.y * SCALED_TILE_SIZE,
        velocityX: 0,
        velocityY: 0,
        spriteId: playerSpriteId,
        direction: 'down',
        animation: 'idle',
        speed: 200,
        isMoving: false
      };
      setPlayer(playerEntity);
      
      const camX = playerEntity.pixelX - VIEWPORT_WIDTH / 2 + SCALED_TILE_SIZE / 2;
      const camY = playerEntity.pixelY - VIEWPORT_HEIGHT / 2 + SCALED_TILE_SIZE / 2;
      setCameraX(Math.max(0, camX));
      setCameraY(Math.max(0, camY));
      
      setGameState('playing');
      addLog(`Entered ${DUNGEON_FLOORS[floorId]?.name || floorId}`);
    };
    
    initDungeon();
  }, [floorId, playerSpriteId, addLog]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysPressed.current.add(e.key.toLowerCase());
    
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current.delete(e.key.toLowerCase());
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const processInput = useCallback(() => {
    if (!player || !tilemap || !dungeonRef || player.isMoving || gameState !== 'playing') return;
    
    let dx = 0;
    let dy = 0;
    
    if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy = -1;
    if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy = 1;
    if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx = -1;
    if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx = 1;
    
    if (dx === 0 && dy === 0) return;
    
    if (dx !== 0) dy = 0;
    
    const newTileX = player.tileX + dx;
    const newTileY = player.tileY + dy;
    
    const newDirection: Direction = 
      dx > 0 ? 'right' : 
      dx < 0 ? 'left' : 
      dy > 0 ? 'down' : 'up';
    
    const monster = tilemap.entities.find(e => 
      e.type === 'monster' && 
      e.tileX === newTileX && 
      e.tileY === newTileY &&
      e.hp && e.hp > 0
    );
    
    if (monster) {
      setPlayer(prev => prev ? { ...prev, direction: newDirection, animation: 'attack' } : null);
      
      const critChance = characterStats.criticalChance ?? 0.05;
      const critFactor = characterStats.criticalFactor ?? 1.5;
      const isCrit = Math.random() < critChance;
      
      const baseDamage = Math.max(1, characterStats.attack - (monster.data?.baseDefense || 0));
      const variance = 0.9 + Math.random() * 0.2;
      const damage = Math.floor(baseDamage * variance * (isCrit ? critFactor : 1));
      
      monster.hp = (monster.hp || 0) - damage;
      monster.animation = monster.hp <= 0 ? 'death' : 'hurt';
      
      const critText = isCrit ? ' (CRITICAL!)' : '';
      addLog(`Dealt ${damage} damage to ${monster.data?.name || 'enemy'}${critText}`);
      
      if (monster.hp <= 0) {
        addLog(`Defeated ${monster.data?.name || 'enemy'}!`);
        const deadEntity = dungeonRef.entities.find(e => e.id === monster.id);
        if (deadEntity) {
          deadEntity.hp = 0;
          deadEntity.spriteState = 'dead';
        }
      }
      
      setTilemap({ ...tilemap });
      
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = setTimeout(() => {
        setPlayer(prev => prev ? { ...prev, animation: 'idle' } : null);
      }, 300);
      
      return;
    }
    
    if (moveEntity(player, newTileX, newTileY, tilemap)) {
      setPlayer({ ...player, direction: newDirection });
      
      computeFOV(dungeonRef, newTileX, newTileY, FOV_RADIUS);
      updateVisibility(tilemap, dungeonRef);
      
      const tile = dungeonRef.tiles[newTileY]?.[newTileX];
      if (tile?.type === 'stairs_down') {
        addLog('You found the exit!');
        setGameState('victory');
        onVictory?.();
      } else if (tile?.type === 'chest') {
        addLog('You found a treasure chest!');
        dungeonRef.tiles[newTileY][newTileX] = { ...tile, type: 'floor', spriteIndex: 0 };
        tilemap.tiles[newTileY][newTileX] = 1;
      }
      
      setTilemap({ ...tilemap });
    } else {
      setPlayer(prev => prev ? { ...prev, direction: newDirection } : null);
    }
  }, [player, tilemap, dungeonRef, gameState, characterStats.attack, addLog, onVictory]);

  const gameLoop = useCallback((timestamp: number) => {
    if (gameState !== 'playing') return;
    
    const deltaTime = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
    lastTimeRef.current = timestamp;
    
    processInput();
    
    if (player && player.isMoving) {
      updateEntityPhysics(player, deltaTime);
      
      if (!player.isMoving) {
        player.animation = 'idle';
      }
      
      setPlayer({ ...player });
      
      const camX = player.pixelX - VIEWPORT_WIDTH / 2 + SCALED_TILE_SIZE / 2;
      const camY = player.pixelY - VIEWPORT_HEIGHT / 2 + SCALED_TILE_SIZE / 2;
      
      const maxCamX = (tilemap?.width || 0) * SCALED_TILE_SIZE - VIEWPORT_WIDTH;
      const maxCamY = (tilemap?.height || 0) * SCALED_TILE_SIZE - VIEWPORT_HEIGHT;
      
      setCameraX(Math.max(0, Math.min(camX, maxCamX)));
      setCameraY(Math.max(0, Math.min(camY, maxCamY)));
    }
    
    if (tilemap) {
      let needsUpdate = false;
      for (const entity of tilemap.entities) {
        if (entity.type === 'monster' && entity.isMoving) {
          updateEntityPhysics(entity, deltaTime);
          needsUpdate = true;
        }
      }
      if (needsUpdate) {
        setTilemap({ ...tilemap });
      }
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, player, tilemap, processInput]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, [gameState, gameLoop]);

  if (gameState === 'loading' || !tilemap || !player) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg" data-testid="dungeon-loading">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading dungeon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="tiled-dungeon-game">
      <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <Progress value={(currentHp / characterStats.maxHp) * 100} className="w-32 h-3" />
            <span className="text-sm text-gray-300">{currentHp}/{characterStats.maxHp}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <Progress value={(currentMana / characterStats.maxMana) * 100} className="w-32 h-3" />
            <span className="text-sm text-gray-300">{currentMana}/{characterStats.maxMana}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Sword className="w-4 h-4" /> {characterStats.attack}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-4 h-4" /> {characterStats.defense}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" /> {DUNGEON_FLOORS[floorId]?.name || floorId}
          </span>
        </div>
      </div>

      <div 
        className="relative overflow-hidden rounded-lg border-4 border-gray-700 bg-black mx-auto"
        style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }}
        data-testid="dungeon-viewport"
      >
        <MiniWorldRenderer
          tiles={tilemap.tiles}
          visibilityMask={tilemap.visibility}
          exploredMask={tilemap.explored}
          viewportWidth={VIEWPORT_WIDTH}
          viewportHeight={VIEWPORT_HEIGHT}
          cameraX={cameraX}
          cameraY={cameraY}
          groundTileset="dungeon"
          entities={[
            ...tilemap.entities
              .filter(e => e.hp && e.hp > 0)
              .map(entity => {
                const monsterSprite = getMonsterMiniWorldSprite(entity.data?.id || '');
                const animState = entity.animation === 'hurt' || entity.animation === 'death' 
                  ? 'idle' 
                  : (entity.animation === 'walk' || entity.animation === 'run' ? 'walk' : 
                     entity.animation === 'attack' ? 'attack' : 'idle');
                return {
                  id: entity.id,
                  type: 'monster' as const,
                  tileX: entity.tileX,
                  tileY: entity.tileY,
                  pixelX: entity.pixelX,
                  pixelY: entity.pixelY,
                  spriteId: monsterSprite?.id || 'goblin_club',
                  animation: animState as 'idle' | 'walk' | 'attack',
                  frame: 0,
                  hp: entity.hp,
                  maxHp: entity.maxHp,
                  name: entity.data?.name,
                  monsterId: entity.data?.id
                };
              }),
            {
              id: 'player',
              type: 'player' as const,
              tileX: player.tileX,
              tileY: player.tileY,
              pixelX: player.pixelX,
              pixelY: player.pixelY,
              spriteId: getHeroMiniWorldSprite(characterClass || 'warrior').id,
              animation: (player.animation === 'hurt' || player.animation === 'death' 
                ? 'idle' 
                : (player.animation === 'walk' || player.animation === 'run' ? 'walk' : 
                   player.animation === 'attack' ? 'attack' : 'idle')) as 'idle' | 'walk' | 'attack',
              frame: 0,
              direction: player.direction as 'up' | 'down' | 'left' | 'right'
            }
          ]}
        />

        {gameState === 'victory' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70" data-testid="victory-overlay">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-yellow-400 mb-4">Victory!</h2>
              <p className="text-gray-300 mb-6">You cleared the dungeon!</p>
              <button
                onClick={onExit}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                data-testid="button-exit-dungeon"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {gameState === 'defeat' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70" data-testid="defeat-overlay">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-red-500 mb-4">Defeat</h2>
              <p className="text-gray-300 mb-6">You have been slain...</p>
              <button
                onClick={onExit}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                data-testid="button-retry-dungeon"
              >
                Return
              </button>
            </div>
          </div>
        )}
      </div>

      <AbilityBar
        state={abilityBarState}
        currentMana={currentMana}
        currentStamina={currentStamina}
        onAbilityActivated={handleAbilityActivated}
        onStateChange={setAbilityBarState}
        disabled={gameState !== 'playing'}
      />

      <div className="bg-gray-800 p-3 rounded-lg max-h-32 overflow-y-auto" data-testid="event-log">
        {eventLog.length === 0 ? (
          <p className="text-xs text-gray-500">Game events will appear here...</p>
        ) : (
          eventLog.map((log, i) => (
            <p key={i} className="text-xs text-gray-400">{log}</p>
          ))
        )}
      </div>

      <div className="text-center text-sm text-gray-500">
        Use WASD or Arrow Keys to move. Press 1-5 to use abilities.
      </div>
    </div>
  );
}

function convertSpecialMapToDungeon(map: LoadedMap): GeneratedDungeon {
  const tiles = map.tiles.map((row, y) => 
    row.map((tileIndex, x) => ({
      type: map.collision[y]?.[x] ? 'wall' as const : 'floor' as const,
      explored: false,
      visible: false,
      spriteIndex: tileIndex
    }))
  );
  
  const entities: DungeonEntity[] = map.objects
    .filter(obj => obj.type === 'monster')
    .map((obj, i) => ({
      id: `monster_${i}`,
      type: 'monster' as const,
      x: obj.tileX,
      y: obj.tileY,
      hp: 50,
      maxHp: 50,
      direction: 'down' as const,
      spriteState: 'idle' as const,
      lastMoveTime: 0,
      aggroRange: 6,
      isAggro: false
    }));
  
  return {
    width: map.width,
    height: map.height,
    tiles,
    entities,
    entrance: map.playerStart || { x: 1, y: 1 },
    exit: map.exits[0] || { x: map.width - 2, y: map.height - 2 },
    rooms: [],
    seed: Date.now()
  };
}

export default TiledDungeonGame;
