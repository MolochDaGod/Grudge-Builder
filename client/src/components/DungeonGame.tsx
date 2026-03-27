import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { assetUrl } from "@/lib/assetConfig";

interface CombatEffect {
  id: number;
  type: 'projectile' | 'impact' | 'aoe';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  spriteUrl: string;
  frameCount: number;
  currentFrame: number;
  frameTimer: number;
  speed: number;
  size: number;
  complete: boolean;
  facingRight: boolean;
}

interface Character {
  id: number;
  name: string;
  class: string;
  level: number;
}

interface DungeonMap {
  width: number;
  height: number;
  tiles: number[][];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
  enemies: { type: string; x: number; y: number }[];
  treasures: { x: number; y: number }[];
}

interface Enemy {
  type: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  state: string;
  animFrame: number;
  animTimer: number;
  facingRight: boolean;
}

interface Player {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  state: string;
  animFrame: number;
  animTimer: number;
  facingRight: boolean;
  characterClass: string;
}

const TILE_SIZE = 40;
const SPRITE_SCALE = 1.5;

const CLASS_EFFECTS: Record<string, { sprite: string; frameCount: number; type: 'projectile' | 'impact'; speed: number; size: number }> = {
  'Worg Shapeshifter': {
    sprite: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear(Split Effects)/Werebear-Attack01_Effect.png"),
    frameCount: 9, type: 'impact', speed: 0, size: 100
  },
  'Warrior': {
    sprite: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight(Split Effects)/Knight-Attack01_Effect.png"),
    frameCount: 7, type: 'impact', speed: 0, size: 100
  },
  'Mage Priest': {
    sprite: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard(Split Effects)/Wizard-Attack01_Effect.png"),
    frameCount: 6, type: 'projectile', speed: 400, size: 100
  },
  'Ranger Scout': {
    sprite: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer(Split Effects)/Archer-Attack01_Effect.png"),
    frameCount: 9, type: 'projectile', speed: 500, size: 100
  }
};

const ENEMY_EFFECTS: Record<string, { sprite: string; frameCount: number; type: 'projectile' | 'impact'; speed: number; size: number }> = {
  slime: {
    sprite: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime(Split Effects)/Slime-Attack01_Effect.png"),
    frameCount: 6, type: 'impact', speed: 0, size: 100
  },
  skeleton: {
    sprite: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton(Split Effects)/Skeleton-Attack01_Effect.png"),
    frameCount: 6, type: 'impact', speed: 0, size: 100
  },
  orc: {
    sprite: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc(Split Effects)/Orc-attack01_Effect.png"),
    frameCount: 6, type: 'impact', speed: 0, size: 100
  }
};

const CLASS_SPRITES: Record<string, { idle: string; walk: string; attack: string; hurt: string; death: string; frames: Record<string, number>; size: number }> = {
  'Worg Shapeshifter': {
    idle: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear with shadows/Werebear-Idle.png"),
    walk: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear with shadows/Werebear-Walk.png"),
    attack: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear with shadows/Werebear-Attack01.png"),
    hurt: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear with shadows/Werebear-Hurt.png"),
    death: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear with shadows/Werebear-Death.png"),
    frames: { idle: 4, walk: 6, attack: 6, hurt: 3, death: 6 },
    size: 100
  },
  'Warrior': {
    idle: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight with shadows/Knight-Idle.png"),
    walk: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight with shadows/Knight-Walk.png"),
    attack: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight with shadows/Knight-Attack01.png"),
    hurt: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight with shadows/Knight-Hurt.png"),
    death: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight with shadows/Knight-Death.png"),
    frames: { idle: 4, walk: 6, attack: 5, hurt: 2, death: 6 },
    size: 100
  },
  'Mage Priest': {
    idle: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard with shadows/Wizard-Idle.png"),
    walk: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard with shadows/Wizard-Walk.png"),
    attack: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard with shadows/Wizard-Attack01.png"),
    hurt: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard with shadows/Wizard-Hurt.png"),
    death: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard with shadows/Wizard-DEATH.png"),
    frames: { idle: 4, walk: 6, attack: 8, hurt: 3, death: 5 },
    size: 100
  },
  'Ranger Scout': {
    idle: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer with shadows/Archer-Idle.png"),
    walk: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer with shadows/Archer-Walk.png"),
    attack: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer with shadows/Archer-Attack01.png"),
    hurt: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer with shadows/Archer-Hurt.png"),
    death: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer with shadows/Archer-Death.png"),
    frames: { idle: 4, walk: 6, attack: 5, hurt: 3, death: 6 },
    size: 100
  }
};

const ENEMY_SPRITES: Record<string, { idle: string; walk: string; attack: string; hurt: string; death: string; frames: Record<string, number>; size: number }> = {
  slime: {
    idle: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime with shadows/Slime-Idle.png"),
    walk: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime with shadows/Slime-Walk.png"),
    attack: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime with shadows/Slime-Attack01.png"),
    hurt: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime with shadows/Slime-Hurt.png"),
    death: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime with shadows/Slime-Death.png"),
    frames: { idle: 4, walk: 4, attack: 7, hurt: 3, death: 4 },
    size: 100
  },
  skeleton: {
    idle: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton with shadows/Skeleton-Idle.png"),
    walk: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton with shadows/Skeleton-Walk.png"),
    attack: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton with shadows/Skeleton-Attack01.png"),
    hurt: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton with shadows/Skeleton-Hurt.png"),
    death: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton with shadows/Skeleton-Death.png"),
    frames: { idle: 4, walk: 4, attack: 8, hurt: 4, death: 4 },
    size: 100
  },
  orc: {
    idle: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc with shadows/Orc-Idle.png"),
    walk: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc with shadows/Orc-Walk.png"),
    attack: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc with shadows/Orc-Attack01.png"),
    hurt: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc with shadows/Orc-Hurt.png"),
    death: assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc with shadows/Orc-Death.png"),
    frames: { idle: 4, walk: 4, attack: 6, hurt: 4, death: 4 },
    size: 100
  }
};

const imageCache: Record<string, HTMLImageElement> = {};

function loadImage(src: string): HTMLImageElement {
  if (!imageCache[src]) {
    const img = new Image();
    img.src = src;
    imageCache[src] = img;
  }
  return imageCache[src];
}

function generateFallbackDungeon(floor: number): DungeonMap {
  const width = 20, height = 15;
  const tiles: number[][] = [];
  const enemies: { type: string; x: number; y: number }[] = [];
  const treasures: { x: number; y: number }[] = [];
  
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        tiles[y][x] = 1;
      } else if ((x % 4 === 0 && y % 4 === 0) || Math.random() < 0.08) {
        tiles[y][x] = Math.random() < 0.3 ? 5 : 1;
      } else {
        tiles[y][x] = 0;
      }
    }
  }
  
  tiles[2][2] = 0;
  tiles[height - 3][width - 3] = 4;
  
  const enemyTypes = ['slime', 'skeleton', 'orc'];
  const enemyCount = 2 + Math.floor(floor / 2);
  for (let i = 0; i < enemyCount; i++) {
    enemies.push({
      type: enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
      x: 4 + Math.floor(Math.random() * (width - 8)),
      y: 4 + Math.floor(Math.random() * (height - 8))
    });
  }
  
  treasures.push({ x: width - 5, y: height - 5 });
  
  return {
    width,
    height,
    tiles,
    spawnPoint: { x: 2, y: 2 },
    exitPoint: { x: width - 3, y: height - 3 },
    enemies,
    treasures
  };
}

interface Props {
  onExit: () => void;
}

export default function DungeonGame({ onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [floor, setFloor] = useState(1);
  const [score, setScore] = useState(0);
  const [dungeonMap, setDungeonMap] = useState<DungeonMap | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [gameOver, setGameOver] = useState(false);
  const [treasuresCollected, setTreasuresCollected] = useState<Set<string>>(new Set());
  const combatEffectsRef = useRef<CombatEffect[]>([]);
  const effectIdRef = useRef(0);
  
  const wallsImg = loadImage(assetUrl("/sprites/dampdungeons/Dungeon_WallsAndFloors.png"));
  const decorImg = loadImage(assetUrl("/sprites/dampdungeons/DungeonDecorations.png"));
  
  useEffect(() => {
    fetch('/api/characters')
      .then(res => res.json())
      .then(data => setCharacters(data))
      .catch(console.error);
  }, []);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
        setKeys(prev => ({ ...prev, [e.key]: true }));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: false }));
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  const startGame = useCallback(async (character: Character) => {
    setSelectedCharacter(character);
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setFloor(1);
    setTreasuresCollected(new Set());
    
    let map: DungeonMap;
    try {
      const response = await fetch('/api/generate-dungeon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floor: 1, theme: 'crypt' })
      });
      const data = await response.json();
      if (data && data.tiles && Array.isArray(data.tiles)) {
        map = data;
      } else {
        map = generateFallbackDungeon(1);
      }
    } catch {
      map = generateFallbackDungeon(1);
    }
    
    setDungeonMap(map);
    
    const newPlayer: Player = {
      x: map.spawnPoint.x * TILE_SIZE + TILE_SIZE / 2,
      y: map.spawnPoint.y * TILE_SIZE + TILE_SIZE / 2,
      health: 100,
      maxHealth: 100,
      speed: 4,
      state: 'idle',
      animFrame: 0,
      animTimer: 0,
      facingRight: true,
      characterClass: character.class
    };
    setPlayer(newPlayer);
    
    const newEnemies: Enemy[] = map.enemies.map(e => ({
      type: e.type,
      x: e.x * TILE_SIZE + TILE_SIZE / 2,
      y: e.y * TILE_SIZE + TILE_SIZE / 2,
      health: 30 + floor * 10,
      maxHealth: 30 + floor * 10,
      damage: 5 + floor * 2,
      speed: 1.5 + Math.random(),
      state: 'idle',
      animFrame: 0,
      animTimer: 0,
      facingRight: Math.random() > 0.5
    }));
    setEnemies(newEnemies);
  }, [floor]);
  
  useEffect(() => {
    if (!gameStarted || !player || !dungeonMap || gameOver) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let lastTime = performance.now();
    
    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      let newPlayer = { ...player };
      let dx = 0, dy = 0;
      
      const isAttacking = keys[' '];
      
      if (keys['w'] || keys['ArrowUp']) dy -= 1;
      if (keys['s'] || keys['ArrowDown']) dy += 1;
      if (keys['a'] || keys['ArrowLeft']) { dx -= 1; newPlayer.facingRight = false; }
      if (keys['d'] || keys['ArrowRight']) { dx += 1; newPlayer.facingRight = true; }
      
      if (!isAttacking) {
        if (dx !== 0 || dy !== 0) {
          const len = Math.sqrt(dx * dx + dy * dy);
          dx /= len;
          dy /= len;
          
          const newX = newPlayer.x + dx * newPlayer.speed;
          const newY = newPlayer.y + dy * newPlayer.speed;
          
          const tileX = Math.floor(newX / TILE_SIZE);
          const tileY = Math.floor(newY / TILE_SIZE);
          
          if (tileX >= 0 && tileX < dungeonMap.width && tileY >= 0 && tileY < dungeonMap.height) {
            const tile = dungeonMap.tiles[tileY]?.[tileX] ?? 1;
            if (tile !== 1) {
              newPlayer.x = newX;
              newPlayer.y = newY;
              newPlayer.state = 'walk';
            }
          }
        } else {
          newPlayer.state = 'idle';
        }
      }
      
      newPlayer.animTimer += deltaTime;
      if (newPlayer.animTimer > 0.1) {
        newPlayer.animTimer = 0;
        newPlayer.animFrame++;
      }
      
      const playerTileX = Math.floor(newPlayer.x / TILE_SIZE);
      const playerTileY = Math.floor(newPlayer.y / TILE_SIZE);
      const currentTile = dungeonMap.tiles[playerTileY]?.[playerTileX];
      if (currentTile === 4) {
        setScore(prev => prev + 100);
        setFloor(prev => prev + 1);
        setGameStarted(false);
        setTimeout(() => {
          if (selectedCharacter) startGame(selectedCharacter);
        }, 500);
      }
      
      dungeonMap.treasures.forEach((t, i) => {
        const key = `${t.x}-${t.y}`;
        if (!treasuresCollected.has(key)) {
          const dist = Math.sqrt(
            Math.pow(newPlayer.x - (t.x * TILE_SIZE + TILE_SIZE / 2), 2) +
            Math.pow(newPlayer.y - (t.y * TILE_SIZE + TILE_SIZE / 2), 2)
          );
          if (dist < 30) {
            setTreasuresCollected(prev => new Set(Array.from(prev).concat(key)));
            setScore(prev => prev + 50);
          }
        }
      });
      
      const newEnemies = enemies.map(e => {
        const distToPlayer = Math.sqrt(
          Math.pow(e.x - newPlayer.x, 2) + Math.pow(e.y - newPlayer.y, 2)
        );
        
        let newEnemy = { ...e };
        
        if (distToPlayer < 200 && distToPlayer > 40 && e.health > 0) {
          const dx = (newPlayer.x - e.x) / distToPlayer;
          const dy = (newPlayer.y - e.y) / distToPlayer;
          newEnemy.x += dx * e.speed;
          newEnemy.y += dy * e.speed;
          newEnemy.state = 'walk';
          newEnemy.facingRight = dx > 0;
        } else if (distToPlayer <= 40 && e.health > 0) {
          if (newEnemy.state !== 'attack') {
            newEnemy.state = 'attack';
            newEnemy.animFrame = 0;
          }
          const sprites = ENEMY_SPRITES[e.type];
          const attackFrameCount = sprites?.frames.attack || 6;
          const attackFrame = 3;
          if (newEnemy.animFrame === attackFrame) {
            newPlayer.health -= e.damage * 0.5;
            const enemyEffectConfig = ENEMY_EFFECTS[e.type];
            if (enemyEffectConfig) {
              combatEffectsRef.current.push({
                id: effectIdRef.current++,
                type: enemyEffectConfig.type,
                x: e.x,
                y: e.y,
                targetX: newPlayer.x,
                targetY: newPlayer.y,
                startX: e.x,
                startY: e.y,
                spriteUrl: enemyEffectConfig.sprite,
                frameCount: enemyEffectConfig.frameCount,
                currentFrame: 0,
                frameTimer: 0,
                speed: enemyEffectConfig.speed,
                size: enemyEffectConfig.size,
                complete: false,
                facingRight: newEnemy.facingRight
              });
            }
          }
          if (newEnemy.animFrame >= attackFrameCount) {
            newEnemy.animFrame = 0;
          }
        } else {
          newEnemy.state = 'idle';
        }
        
        newEnemy.animTimer += deltaTime;
        if (newEnemy.animTimer > 0.1) {
          newEnemy.animTimer = 0;
          newEnemy.animFrame++;
        }
        
        return newEnemy;
      });
      
      if (isAttacking) {
        if (newPlayer.state !== 'attack') {
          newPlayer.state = 'attack';
          newPlayer.animFrame = 0;
        }
        const effectConfig = CLASS_EFFECTS[newPlayer.characterClass];
        const playerSprites = CLASS_SPRITES[newPlayer.characterClass] || CLASS_SPRITES['Warrior'];
        const attackFrameCount = playerSprites?.frames.attack || 5;
        const attackFrame = 3;
        if (newPlayer.animFrame === attackFrame) {
          newEnemies.forEach(e => {
            const dist = Math.sqrt(Math.pow(e.x - newPlayer.x, 2) + Math.pow(e.y - newPlayer.y, 2));
            if (dist < 80 && e.health > 0) {
              e.health -= 2;
              e.state = 'hurt';
              if (e.health <= 0) {
                e.state = 'death';
                setScore(prev => prev + 25);
              }
              if (effectConfig) {
                combatEffectsRef.current.push({
                  id: effectIdRef.current++,
                  type: effectConfig.type,
                  x: newPlayer.x,
                  y: newPlayer.y,
                  targetX: e.x,
                  targetY: e.y,
                  startX: newPlayer.x,
                  startY: newPlayer.y,
                  spriteUrl: effectConfig.sprite,
                  frameCount: effectConfig.frameCount,
                  currentFrame: 0,
                  frameTimer: 0,
                  speed: effectConfig.speed,
                  size: effectConfig.size,
                  complete: false,
                  facingRight: newPlayer.facingRight
                });
              }
            }
          });
        }
        if (newPlayer.animFrame >= attackFrameCount) {
          newPlayer.animFrame = 0;
        }
      }
      
      combatEffectsRef.current = combatEffectsRef.current.map(effect => {
        if (effect.complete) return effect;
        
        let newEffect = { ...effect };
        newEffect.frameTimer += deltaTime;
        
        if (newEffect.frameTimer > 0.08) {
          newEffect.frameTimer = 0;
          newEffect.currentFrame++;
          
          if (newEffect.currentFrame >= newEffect.frameCount) {
            newEffect.complete = true;
          }
        }
        
        if (effect.type === 'projectile' && effect.speed > 0) {
          const dx = effect.targetX - effect.startX;
          const dy = effect.targetY - effect.startY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const travelTime = distance / effect.speed;
          const elapsedTime = newEffect.currentFrame * 0.08;
          const progress = Math.min(1, elapsedTime / travelTime);
          newEffect.x = effect.startX + dx * progress;
          newEffect.y = effect.startY + dy * progress;
        } else {
          newEffect.x = effect.targetX;
          newEffect.y = effect.targetY;
        }
        
        return newEffect;
      }).filter(e => !e.complete);
      
      setPlayer(newPlayer);
      setEnemies(newEnemies.filter(e => e.health > 0 || e.state === 'death'));
      
      if (newPlayer.health <= 0) {
        setGameOver(true);
      }
      
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let y = 0; y < dungeonMap.height; y++) {
        for (let x = 0; x < dungeonMap.width; x++) {
          const tile = dungeonMap.tiles[y]?.[x] ?? 1;
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;
          
          if (wallsImg.complete) {
            let srcX = 0, srcY = 0;
            const spriteSize = 16;
            
            if (tile === 0) { srcX = 48; srcY = 48; }
            else if (tile === 1) { srcX = 0; srcY = 0; }
            else if (tile === 2) { srcX = 80; srcY = 48; }
            else if (tile === 3) { srcX = 32; srcY = 64; }
            else if (tile === 4) { srcX = 64; srcY = 0; }
            else if (tile === 5) {
              srcX = 48; srcY = 48;
              ctx.drawImage(wallsImg, srcX, srcY, spriteSize, spriteSize, px, py, TILE_SIZE, TILE_SIZE);
              if (decorImg.complete) {
                const decorX = (Math.floor(x * 7 + y * 3) % 4) * 16;
                ctx.drawImage(decorImg, decorX, 0, 16, 16, px, py, TILE_SIZE, TILE_SIZE);
              }
              continue;
            }
            
            ctx.drawImage(wallsImg, srcX, srcY, spriteSize, spriteSize, px, py, TILE_SIZE, TILE_SIZE);
          } else {
            if (tile === 0) ctx.fillStyle = '#3a3a4e';
            else if (tile === 1) ctx.fillStyle = '#1a1a2e';
            else if (tile === 2) ctx.fillStyle = '#2a4a6a';
            else if (tile === 3) ctx.fillStyle = '#6a4a2a';
            else if (tile === 4) ctx.fillStyle = '#4a2a6a';
            else ctx.fillStyle = '#2a2a3e';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        }
      }
      
      dungeonMap.treasures.forEach(t => {
        const key = `${t.x}-${t.y}`;
        if (!treasuresCollected.has(key)) {
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(t.x * TILE_SIZE + TILE_SIZE / 2, t.y * TILE_SIZE + TILE_SIZE / 2, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('$', t.x * TILE_SIZE + TILE_SIZE / 2, t.y * TILE_SIZE + TILE_SIZE / 2 + 5);
        }
      });
      
      enemies.forEach(e => {
        const sprites = ENEMY_SPRITES[e.type];
        if (!sprites) return;
        
        const spriteSheet = loadImage(sprites[e.state as keyof typeof sprites] as string || sprites.idle);
        const frameCount = sprites.frames[e.state] || 4;
        const frame = e.animFrame % frameCount;
        const size = sprites.size * SPRITE_SCALE;
        
        ctx.save();
        ctx.translate(e.x, e.y);
        if (!e.facingRight) ctx.scale(-1, 1);
        
        if (spriteSheet.complete) {
          ctx.drawImage(
            spriteSheet,
            frame * sprites.size, 0,
            sprites.size, sprites.size,
            -size / 2, -size / 2,
            size, size
          );
        }
        ctx.restore();
        
        if (e.health > 0) {
          ctx.fillStyle = '#333';
          ctx.fillRect(e.x - 20, e.y - size / 2 - 10, 40, 6);
          ctx.fillStyle = '#f00';
          ctx.fillRect(e.x - 20, e.y - size / 2 - 10, 40 * (e.health / e.maxHealth), 6);
        }
      });
      
      const playerSprites = CLASS_SPRITES[newPlayer.characterClass] || CLASS_SPRITES['Warrior'];
      const playerSheet = loadImage(playerSprites[newPlayer.state as keyof typeof playerSprites] as string || playerSprites.idle);
      const playerFrameCount = playerSprites.frames[newPlayer.state] || 4;
      const playerFrame = newPlayer.animFrame % playerFrameCount;
      const playerSize = playerSprites.size * SPRITE_SCALE;
      
      ctx.save();
      ctx.translate(newPlayer.x, newPlayer.y);
      if (!newPlayer.facingRight) ctx.scale(-1, 1);
      
      if (playerSheet.complete) {
        ctx.drawImage(
          playerSheet,
          playerFrame * playerSprites.size, 0,
          playerSprites.size, playerSprites.size,
          -playerSize / 2, -playerSize / 2,
          playerSize, playerSize
        );
      }
      ctx.restore();
      
      combatEffectsRef.current.forEach(effect => {
        const effectSheet = loadImage(effect.spriteUrl);
        if (effectSheet.complete) {
          const size = effect.size * SPRITE_SCALE;
          const frame = effect.currentFrame % effect.frameCount;
          
          ctx.save();
          ctx.translate(effect.x, effect.y);
          if (!effect.facingRight) ctx.scale(-1, 1);
          
          ctx.drawImage(
            effectSheet,
            frame * effect.size, 0,
            effect.size, effect.size,
            -size / 2, -size / 2,
            size, size
          );
          ctx.restore();
        }
      });
      
      ctx.fillStyle = '#333';
      ctx.fillRect(10, 10, 200, 20);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(10, 10, 200 * (newPlayer.health / newPlayer.maxHealth), 20);
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      ctx.fillText(`HP: ${Math.floor(newPlayer.health)}/${newPlayer.maxHealth}`, 15, 26);
      
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.fillText(`Floor: ${floor}  Score: ${score}`, 10, 50);
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    animationId = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameStarted, player, dungeonMap, enemies, keys, floor, score, gameOver, treasuresCollected, selectedCharacter, startGame]);
  
  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-stone-900 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-stone-200 mb-6">Select Your Hero</h2>
        
        {characters.length === 0 ? (
          <p className="text-stone-400">No characters found. Create one first!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {characters.map(char => (
              <button
                key={char.id}
                onClick={() => startGame(char)}
                className="p-4 bg-stone-800 border border-stone-700 rounded-lg hover:bg-stone-700 transition-colors"
                data-testid={`select-hero-${char.id}`}
              >
                <div className="text-stone-200 font-bold">{char.name}</div>
                <div className="text-stone-400 text-sm">{char.class}</div>
                <div className="text-amber-500 text-sm">Lv. {char.level}</div>
              </button>
            ))}
          </div>
        )}
        
        <Button
          variant="outline"
          onClick={onExit}
          className="border-stone-600"
          data-testid="btn-exit-dungeon"
        >
          Back to Home
        </Button>
      </div>
    );
  }
  
  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-stone-900 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-red-500 mb-4">Game Over</h2>
        <p className="text-stone-300 mb-2">Floor Reached: {floor}</p>
        <p className="text-stone-300 mb-6">Final Score: {score}</p>
        <div className="flex gap-4">
          <Button
            onClick={() => selectedCharacter && startGame(selectedCharacter)}
            className="bg-purple-900 hover:bg-purple-800"
            data-testid="btn-retry"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setGameStarted(false);
              setGameOver(false);
            }}
            className="border-stone-600"
            data-testid="btn-select-new-hero"
          >
            Select New Hero
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center bg-stone-900 rounded-lg p-4">
      <div className="flex justify-between w-full mb-4">
        <div className="text-stone-300">
          <span className="font-bold">{selectedCharacter?.name}</span> - {selectedCharacter?.class}
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setGameStarted(false);
            setGameOver(false);
          }}
          className="text-stone-400 hover:text-stone-200"
          data-testid="btn-quit-dungeon"
        >
          Quit
        </Button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-stone-700 rounded"
        data-testid="dungeon-canvas"
      />
      
      <p className="text-stone-500 text-sm mt-4">
        WASD or Arrow keys to move | Space to attack
      </p>
    </div>
  );
}
