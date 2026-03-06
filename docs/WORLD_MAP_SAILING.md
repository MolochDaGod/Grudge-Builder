# World Map Sailing System - Learning Guide

## Overview

The World Map system provides an ocean-based exploration experience where players navigate between islands using sailboats, engage in naval combat with cannons, and discover new territories for harvesting, hunting, and gathering resources.

## Sprite Assets Reference

### Sailboat Sprites (`public/sprites/pirate/`)

#### Hull & Sails (Same-size layers, designed to overlap)
| File | Dimensions | Usage |
|------|------------|-------|
| `sailboat-side.png` | 157x200 | Hull - base layer for horizontal sailing |
| `sailboat-sails-side.png` | 157x200 | Sails - overlay layer (animate for wind) |
| `sailboat-up.png` | 157x200 | Hull - sailing north/away |
| `sailboat-sails-up.png` | 157x200 | Sails - overlay for north sailing |
| `sailboat-down.png` | 157x200 | Hull - sailing south/toward camera |
| `sailboat-sails-down.png` | 157x200 | Sails - overlay for south sailing |

**Important**: Hull and sails are designed as separate layers with identical dimensions. Always position sails at `top-0 left-0` relative to hull for proper alignment.

#### Sprite Composition Pattern
```tsx
<div className="relative">
  {/* Base hull layer */}
  <img src="/sprites/pirate/sailboat-side.png" className="w-full h-auto" />
  {/* Sails overlay - same position */}
  <img src="/sprites/pirate/sailboat-sails-side.png" 
       className="absolute top-0 left-0 w-full h-auto" />
</div>
```

#### Animation Techniques
- **Bobbing**: Animate `y` position with sine wave pattern (2-3s duration)
- **Sail flutter**: Subtle rotation animation on sails (±1-2 degrees)
- **Direction flip**: Use `transform: scaleX(-1)` for opposite directions

### Ladder Sprites (for docking animations)
| File | Usage |
|------|-------|
| `sailboat-ladder-down.png` | Ladder dropping when docked |
| `sailboat-ladder-side.png` | Side-view docking |
| `sailboat-ladder-up.png` | Climbing aboard |

### Spritesheet (`sailboat.json` + `sailboat.png`)
The `sailboat.json` defines frame coordinates for the main spritesheet with 12 frames (0-11):
- Frames 0-3: Full ship variations (157x350)
- Frames 4-7: Smaller variations (157x200)
- Frames 8-11: Additional angles (157x350)

**Pivot Point**: All frames use center pivot (0.5, 0.5)

### Island & Tile Assets
| File | Usage |
|------|-------|
| `tiles/beach-tiles.png` | Sandy beaches for island edges |
| `items/` folder | Collectible resources (coconut, crab-claw, rope, etc.) |
| `structures/tent.png` | Player camp structures |

## World Map Architecture

### Tile-Based Ocean Map

```typescript
interface WorldMapConfig {
  width: number;      // Map width in tiles
  height: number;     // Map height in tiles
  tileSize: number;   // Pixels per tile (e.g., 32)
  seed: string;       // UUID for deterministic generation
}

interface WorldMapTile {
  x: number;
  y: number;
  type: 'deep_ocean' | 'shallow_water' | 'island' | 'reef' | 'port';
  discovered: boolean;
  islandId?: string;  // Links to Island data
}
```

### Procedural Island Placement

Islands are generated using seeded RNG for deterministic world layouts:

```typescript
function generateWorldMap(seed: string, config: WorldMapConfig): WorldMapTile[][] {
  const rng = seedRandom(seed);
  const tiles: WorldMapTile[][] = [];
  
  // Create base ocean
  for (let y = 0; y < config.height; y++) {
    tiles[y] = [];
    for (let x = 0; x < config.width; x++) {
      tiles[y][x] = {
        x, y,
        type: rng() > 0.7 ? 'shallow_water' : 'deep_ocean',
        discovered: false
      };
    }
  }
  
  // Place islands using noise or clustering algorithm
  const numIslands = Math.floor(config.width * config.height * 0.02);
  for (let i = 0; i < numIslands; i++) {
    const ix = Math.floor(rng() * config.width);
    const iy = Math.floor(rng() * config.height);
    placeIsland(tiles, ix, iy, rng);
  }
  
  return tiles;
}
```

### AI-Generated Island Visuals

Each island uses a UUID seed to generate a unique landscape image:

```typescript
interface IslandVisual {
  id: string;           // UUID
  seed: string;         // For deterministic AI generation
  imageUrl: string;     // Generated landscape image
  thumbnail: string;    // Preview for world map
  terrainZones: TerrainZone[];  // For gameplay node placement
}

async function generateIslandVisual(seed: string): Promise<string> {
  const prompt = buildIslandPrompt(seed);
  // Use AI image generation (Puter AI or similar)
  const imageUrl = await generateImage(prompt);
  return imageUrl;
}
```

## Ship Navigation

### Movement System

```typescript
interface Ship {
  position: { x: number; y: number };  // Current tile position
  direction: 'up' | 'down' | 'left' | 'right';
  speed: number;        // Tiles per second
  isDocked: boolean;
  targetPosition?: { x: number; y: number };
}

// WASD keyboard controls
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key.toLowerCase()) {
    case 'w': moveShip('up'); break;
    case 's': moveShip('down'); break;
    case 'a': moveShip('left'); break;
    case 'd': moveShip('right'); break;
  }
};

// Click-to-move pathfinding
const handleMapClick = (targetTile: WorldMapTile) => {
  if (targetTile.type !== 'island') {
    const path = findPath(ship.position, targetTile);
    ship.targetPosition = targetTile;
    followPath(path);
  }
};
```

### Docking at Islands

```typescript
function dockAtIsland(ship: Ship, island: Island) {
  ship.isDocked = true;
  ship.position = island.dockPosition;
  
  // Transition to island exploration mode
  enterIslandMode(island);
}
```

## Cannon Combat System

### Cannon Aiming

```typescript
interface Cannon {
  angle: number;        // 0-360 degrees
  power: number;        // Shot power/range
  reloadTime: number;   // Seconds to reload
  isReloading: boolean;
}

// Mouse-aim tracking
const handleMouseMove = (e: MouseEvent) => {
  const shipCenter = getShipCenter();
  const angle = Math.atan2(
    e.clientY - shipCenter.y,
    e.clientX - shipCenter.x
  ) * (180 / Math.PI);
  cannon.angle = angle;
};

// Aim indicator
function drawAimLine(ctx: CanvasRenderingContext2D, cannon: Cannon) {
  const length = cannon.power * 10;
  const endX = shipX + Math.cos(cannon.angle * Math.PI / 180) * length;
  const endY = shipY + Math.sin(cannon.angle * Math.PI / 180) * length;
  
  ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(shipX, shipY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}
```

### Firing & Projectiles

```typescript
interface Cannonball {
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
  active: boolean;
}

function fireCannon(cannon: Cannon): Cannonball {
  if (cannon.isReloading) return null;
  
  const radians = cannon.angle * Math.PI / 180;
  const ball: Cannonball = {
    position: { x: shipX, y: shipY },
    velocity: {
      vx: Math.cos(radians) * cannon.power,
      vy: Math.sin(radians) * cannon.power
    },
    active: true
  };
  
  cannon.isReloading = true;
  setTimeout(() => cannon.isReloading = false, cannon.reloadTime * 1000);
  
  return ball;
}

// Projectile physics with gravity
function updateCannonball(ball: Cannonball, deltaTime: number) {
  ball.position.x += ball.velocity.vx * deltaTime;
  ball.position.y += ball.velocity.vy * deltaTime;
  ball.velocity.vy += GRAVITY * deltaTime;  // Arc trajectory
  
  // Check for hits
  const hit = checkCollisions(ball.position);
  if (hit) {
    handleHit(hit, ball);
    ball.active = false;
  }
}
```

### Combat Effects

```
Animation sequence for cannon fire:
1. Flash sprite at cannon position (2 frames)
2. Smoke puff animation (4-6 frames)  
3. Cannonball projectile with motion blur
4. Splash/impact animation on hit
```

## Island Discovery & Exploration

### Discovery System

```typescript
interface DiscoveredIsland {
  id: string;
  name: string;
  position: { x: number; y: number };
  discoveredAt: Date;
  terrainZones: TerrainZone[];
  resources: ResourceNode[];
  hasBeenExplored: boolean;
}

function discoverIsland(tile: WorldMapTile): DiscoveredIsland {
  const island = generateIsland(tile.islandId);
  
  // Reveal fog of war around island
  revealArea(tile.x, tile.y, DISCOVERY_RADIUS);
  
  // Grant discovery XP
  grantXP(player, XP_ISLAND_DISCOVERY);
  
  return island;
}
```

### Resource Gathering on Islands

Each island contains resource nodes based on terrain zones:

| Zone Type | Resources | Professions |
|-----------|-----------|-------------|
| Mountain | Ore nodes (copper, iron, gold) | Mining |
| Forest | Trees, herbs | Logging, Herbalism |
| Field | Grazing animals, plants | Skinning, Herbalism |
| Shore | Fish, shells, crabs | Fishing |
| Clearing | Building space | Engineering |

```typescript
function harvestNode(hero: Character, node: ResourceNode): HarvestResult {
  const profession = getProfessionForNode(node.type);
  const profLevel = hero.professions[profession]?.level || 1;
  
  const baseYield = node.baseYield;
  const bonusYield = Math.floor(profLevel / 10);
  const xpGained = node.xpReward * (1 + profLevel * 0.01);
  
  return {
    items: generateItems(node, baseYield + bonusYield),
    xp: { profession, amount: xpGained }
  };
}
```

## RTS Camera Controls

### Pan & Zoom Implementation

```typescript
const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);

// WASD panning
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const panSpeed = 10;
    switch (e.key.toLowerCase()) {
      case 'w': setCameraOffset(p => ({ ...p, y: p.y - panSpeed })); break;
      case 's': setCameraOffset(p => ({ ...p, y: p.y + panSpeed })); break;
      case 'a': setCameraOffset(p => ({ ...p, x: p.x - panSpeed })); break;
      case 'd': setCameraOffset(p => ({ ...p, x: p.x + panSpeed })); break;
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

// Scroll wheel zoom
useEffect(() => {
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    setZoom(z => Math.max(0.5, Math.min(2, z + delta)));
  };
  window.addEventListener('wheel', handleWheel, { passive: false });
  return () => window.removeEventListener('wheel', handleWheel);
}, []);
```

### Focus on Ship/Island

```typescript
function focusOnShip() {
  const shipPos = getShipWorldPosition();
  setCameraOffset({
    x: shipPos.x - viewportWidth / 2,
    y: shipPos.y - viewportHeight / 2
  });
}

function focusOnIsland(island: DiscoveredIsland) {
  setCameraOffset({
    x: island.position.x - viewportWidth / 2,
    y: island.position.y - viewportHeight / 2
  });
}
```

## XP & Progression Integration

### XP Sources

| Activity | Base XP | Profession Bonus |
|----------|---------|------------------|
| Discover new island | 500 | - |
| Harvest resource node | 10-50 | +1% per level |
| Defeat enemy ship | 100-500 | - |
| Complete treasure hunt | 200-1000 | - |
| Dock at new port | 50 | - |

### Profession Leveling at Sea

- **Fishing**: Catch fish at shore zones
- **Scavenging**: Collect debris and treasures
- **Engineering**: Repair/upgrade ship components

## File Structure

```
client/src/
├── components/
│   ├── WorldMap/
│   │   ├── WorldMapCanvas.tsx    # Main rendering canvas
│   │   ├── ShipSprite.tsx        # Ship with hull/sails layers
│   │   ├── IslandTile.tsx        # Island display on map
│   │   ├── CannonAim.tsx         # Aiming UI overlay
│   │   └── MiniMap.tsx           # Navigation helper
│   └── IslandCutscene.tsx        # First visit animation
├── lib/
│   ├── worldMapSystem.ts         # Generation & navigation
│   ├── cannonSystem.ts           # Combat mechanics
│   └── islandSystem.ts           # Island state management
└── pages/
    └── world-map.tsx             # Main world map page

public/sprites/pirate/
├── sailboat-side.png             # Ship hulls
├── sailboat-sails-side.png       # Sail overlays
├── sailboat.json                 # Spritesheet metadata
├── items/                        # Collectible resources
├── structures/                   # Buildings & camps
└── tiles/                        # Terrain tiles
```

## Implementation Checklist

- [ ] Create WorldMapCanvas with tile-based rendering
- [ ] Implement ship navigation (WASD + click-to-move)
- [ ] Add fog of war revealing on exploration
- [ ] Integrate AI island visual generation
- [ ] Build cannon aiming and projectile system
- [ ] Create docking/island transition flow
- [ ] Connect resource harvesting to profession XP
- [ ] Add enemy ships with basic AI
- [ ] Implement minimap navigation helper
