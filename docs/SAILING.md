# World Map & Sailing System Reference

## Overview

The world map provides ocean navigation, ship combat, and island discovery. Players sail between islands, engage in cannon combat with enemy ships, and explore procedurally generated waters.

## World Map

### Map Generation

The world map uses procedural generation with:
- Ocean tiles (majority)
- Islands (discoverable locations)
- Hazards (storms, whirlpools, reefs)
- Points of interest (shipwrecks, sea monsters)

### Tile Types

| Tile        | Code | Description                    |
|-------------|------|--------------------------------|
| Deep Ocean  | `~`  | Open water, safe sailing       |
| Shallow     | `,`  | Near islands, slower movement  |
| Island      | `I`  | Landmass, can dock             |
| Reef        | `R`  | Hazard, damages hull           |
| Storm       | `S`  | Temporary hazard, slows ships  |
| Whirlpool   | `@`  | Dangerous, can sink ships      |
| Shipwreck   | `W`  | Lootable discovery             |

### Fog of War

Players start with the world hidden. Exploration reveals:
- Tiles within ship's sight range
- Permanent discovery (stays revealed)
- Island locations marked once found

## Ship System

### Ship Types

| Ship Type   | Speed | Hull HP | Cannons | Cargo |
|-------------|-------|---------|---------|-------|
| Raft        | 1     | 50      | 0       | 10    |
| Sloop       | 3     | 150     | 2       | 25    |
| Brigantine  | 4     | 300     | 6       | 50    |
| Galleon     | 3     | 600     | 12      | 100   |
| Man-of-War  | 2     | 1000    | 24      | 75    |

### Ship Properties

```typescript
export const ships = pgTable("ships", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull(),
  shipType: text("ship_type").notNull(),
  name: text("name"),
  currentHull: integer("current_hull").notNull(),
  maxHull: integer("max_hull").notNull(),
  speed: integer("speed").notNull(),
  cannonCount: integer("cannon_count").notNull(),
  cargoCapacity: integer("cargo_capacity").notNull(),
  cargo: jsonb("cargo").$type<CargoItem[]>(),
  crew: jsonb("crew").$type<CrewMember[]>(),
  upgrades: jsonb("upgrades").$type<string[]>(),
  positionX: integer("position_x").notNull(),
  positionY: integer("position_y").notNull(),
});
```

### Ship Upgrades

| Upgrade         | Effect                          |
|-----------------|---------------------------------|
| Reinforced Hull | +25% max hull HP                |
| Improved Sails  | +1 speed                        |
| Extra Cannons   | +2 cannon slots                 |
| Cargo Hold      | +25% cargo capacity             |
| Crow's Nest     | +50% sight range                |
| Ram             | Enables ramming attacks         |

## Navigation

### Movement

Ships move tile-by-tile based on speed:
- Speed = tiles per turn
- Diagonal movement costs 1.5× movement
- Wind affects movement speed (optional)

### Movement Costs

| Terrain     | Cost Multiplier |
|-------------|-----------------|
| Deep Ocean  | 1.0×            |
| Shallow     | 1.5×            |
| Storm       | 2.0×            |
| Against Wind| 1.5× (optional) |
| With Wind   | 0.75× (optional)|

### Pathfinding

Ships use A* pathfinding to navigate around obstacles:

```typescript
function findPath(startX, startY, endX, endY, worldMap) {
  // A* algorithm considering:
  // - Impassable tiles (islands, reefs)
  // - Movement costs
  // - Ship draft (shallow water limits)
  return path; // Array of {x, y} positions
}
```

## Cannon Combat

### Combat Initiation

Combat begins when:
- Player attacks enemy ship
- Enemy ship spots player
- Ships enter adjacent tiles

### Combat Flow

1. **Positioning Phase** - Ships maneuver for broadside
2. **Fire Phase** - Cannons fire based on facing
3. **Damage Resolution** - Apply hull damage
4. **Boarding (optional)** - Crew melee combat
5. **Resolution** - Victory, retreat, or continue

### Cannon Mechanics

| Stat          | Description                     |
|---------------|---------------------------------|
| Damage        | Hull damage per cannon          |
| Range         | Maximum firing distance         |
| Accuracy      | Hit chance at range             |
| Reload        | Turns between volleys           |

### Firing Arcs

Ships have limited firing arcs:
- **Port** (left broadside) - 90° arc
- **Starboard** (right broadside) - 90° arc
- **Bow** (front) - 45° arc (if equipped)
- **Stern** (rear) - 45° arc (if equipped)

### Damage Types

| Ammo Type   | Effect                          |
|-------------|---------------------------------|
| Round Shot  | Standard hull damage            |
| Chain Shot  | Damages sails (reduces speed)   |
| Grape Shot  | Damages crew                    |
| Fire Shot   | Chance to ignite (DoT damage)   |

## Enemy Ships

### Enemy Types

| Enemy         | Behavior                        |
|---------------|---------------------------------|
| Pirate Sloop  | Aggressive, attacks on sight    |
| Merchant      | Flees, low combat ability       |
| Navy Patrol   | Patrols routes, medium threat   |
| Kraken        | Boss encounter, very dangerous  |

### Enemy AI

```typescript
const enemyBehaviors = {
  aggressive: {
    sightRange: 8,
    engageRange: 3,
    retreatThreshold: 0.25, // 25% hull
  },
  merchant: {
    sightRange: 5,
    fleeRange: 10,
    surrenderThreshold: 0.5,
  },
  patrol: {
    patrolRoute: true,
    sightRange: 6,
    pursuitRange: 10,
  }
};
```

## Island Discovery

### Discoverable Islands

| Island Type   | Content                         |
|---------------|---------------------------------|
| Trading Post  | Merchants, supplies, quests     |
| Dungeon Island| Dungeon entrance                |
| Treasure Isle | Hidden loot, puzzles            |
| Enemy Base    | Combat challenge, rich rewards  |
| Wild Island   | Resources, neutral territory    |

### Discovery Rewards

- First discovery grants exploration XP
- Some islands have unique quests
- Treasure maps lead to specific islands
- Faction reputation affects access

## World Map Database

### World State

```typescript
export const worldMaps = pgTable("world_maps", {
  id: varchar("id").primaryKey(),
  seed: integer("seed").notNull(),
  sizeX: integer("size_x").default(256),
  sizeY: integer("size_y").default(256),
  islands: jsonb("islands").$type<IslandData[]>(),
  hazards: jsonb("hazards").$type<HazardData[]>(),
});

export const playerWorldState = pgTable("player_world_state", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull(),
  worldMapId: varchar("world_map_id").notNull(),
  discoveredTiles: jsonb("discovered_tiles").$type<boolean[][]>(),
  discoveredIslands: jsonb("discovered_islands").$type<string[]>(),
  shipId: varchar("ship_id"),
});
```

## API Endpoints

```
GET  /api/world-map                   - Get world map data
GET  /api/world-map/player/:accountId - Get player world state
PUT  /api/ships/:id/move              - Move ship to position
POST /api/ships/:id/combat            - Initiate combat
POST /api/ships/:id/dock              - Dock at island
GET  /api/ships/:accountId            - Get player ships
POST /api/ships                       - Purchase new ship
PUT  /api/ships/:id/upgrade           - Upgrade ship
```

## Implementation Files

### Backend
| File | Purpose |
|------|---------|
| `shared/schema.ts` | ships, worldMaps, playerWorldState tables |
| `server/storage.ts` | Sailing CRUD operations |
| `server/routes.ts` | Ship and world map API endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/pages/world-map.tsx` | World map sailing page |
| `client/src/lib/phaserIslandScene.ts` | Phaser-based map scene |

### Sprite Assets
| Directory | Contents |
|-----------|----------|
| `public/sprites/pirate/` | Sailboat sprites (hull, sails, ladder) |
| `public/sprites/pirate/tiles/` | Beach and island tiles |
| `public/sprites/pirate/items/` | Collectible items (coconut, rope, etc.) |

See also: `docs/WORLD_MAP_SAILING.md` for detailed sprite asset reference.
