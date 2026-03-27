# Island System Reference

## Overview

Each account has a home island that serves as the player's base of operations. Islands feature procedural generation, resource nodes, building placement, and RTS-style camera controls.

## Home Island

### Island Generation

Home islands are procedurally generated with:
- Terrain heightmap (beaches, grass, hills, mountains)
- Resource node placement
- Building plot locations
- Dock/harbor for ship access

### Terrain Types

| Terrain   | Code | Features                       |
|-----------|------|--------------------------------|
| Ocean     | `~`  | Water, impassable on foot      |
| Beach     | `:`  | Shallow water, fishing spots   |
| Grass     | `.`  | Buildable, herb spawns         |
| Forest    | `T`  | Wood, herb nodes               |
| Hills     | `^`  | Ore deposits                   |
| Mountain  | `M`  | Rich ore, impassable           |
| Path      | `=`  | Roads, fast travel             |

### Island Size

| Island Type | Dimensions | Plots | Resource Nodes |
|-------------|------------|-------|----------------|
| Starter     | 32×32      | 5     | 10             |
| Upgraded    | 64×64      | 15    | 30             |
| Maximum     | 128×128    | 30    | 60             |

## Resource Nodes

### Node Types

| Node Type     | Profession   | Resources              |
|---------------|--------------|------------------------|
| Ore Vein      | Mining       | Copper, Iron, Mithril  |
| Herb Cluster  | Herbalism    | Herbs, flowers         |
| Tree          | Woodcutting  | Logs, bark, sap        |
| Fishing Spot  | Fishing      | Fish, shells           |
| Berry Bush    | Foraging     | Berries, seeds         |

### Node Properties

```typescript
export const resourceNodes = pgTable("resource_nodes", {
  id: varchar("id").primaryKey(),
  islandId: varchar("island_id").notNull(),
  accountId: varchar("account_id"),
  type: text("type").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  tier: integer("tier").default(1),
  currentYield: integer("current_yield").default(100),
  maxYield: integer("max_yield").default(100),
  respawnTime: bigint("respawn_time", { mode: "number" }),
});
```

### Respawn Mechanics

| Node Type     | Respawn Time | Yield per Gather |
|---------------|--------------|------------------|
| Ore Vein      | 5 minutes    | 3-5 ore          |
| Herb Cluster  | 3 minutes    | 2-4 herbs        |
| Tree          | 10 minutes   | 5-8 logs         |
| Fishing Spot  | 2 minutes    | 1-3 fish         |
| Berry Bush    | 4 minutes    | 3-6 berries      |

## A* Pathfinding & Hero Movement

### Pathfinding

Heroes use A* pathfinding on the 200×200 tile grid to navigate around mountains, water, and obstacles.

- **8-directional movement** with octile distance heuristic
- **Binary min-heap** priority queue for performance
- **Path simplification** to reduce waypoint count
- **Fallback teleport** if no path is found (e.g. water nodes)
- Node positions are validated on load — land nodes on non-walkable tiles are nudged to nearest walkable tile

### Movement System

- `HeroMovementManager` advances heroes step-by-step along A* waypoint paths
- **60fps tick loop** via `requestAnimationFrame` drives smooth hero movement
- Speed: ~3 world-units/sec (crosses island in ~33 seconds)
- On arrival at target node → auto-assigns hero and triggers first harvest
- Heroes show Walk animation while pathfinding, Attack while harvesting, Idle otherwise

### Integration Points

- **Manual assign**: Click hero → click node → hero pathfinds to node
- **Auto-harvest**: Auto-assigned heroes pathfind to best available node
- **Unassign/Recall**: Heroes pathfind back to camp
- **Return All**: All heroes pathfind back to camp simultaneously

## Building System

### Building Types (MiniWorld Sprites)

Buildings use sprite assets from `/sprites/miniworld/Buildings/` with Wood, Cyan, Lime, Purple, Red color variants.

| Building  | Icon | Max | Cost            | Bonus                                    | Requires Keep |
|-----------|------|-----|-----------------|------------------------------------------|---------------|
| Keep      | 🏰   | 1   | 500g 200w 150s  | +1 hero slot (Island HQ)                 | No            |
| Hut       | 🛖   | 4   | 50g 25w         | +25 storage                              | No            |
| Tavern    | 🍺   | 2   | 300g 100w       | 2× stamina recovery                      | Yes           |
| Workshop  | ⚒️   | 2   | 400g 150w 50s   | -15% harvest interval                    | Yes           |
| Market    | 🏪   | 1   | 350g 100w       | +20% gold sell price                     | Yes           |
| Barracks  | ⚔️   | 2   | 450g 200w 100s  | +1 hero slot                             | Yes           |
| Tower     | 🗼   | 4   | 250g 100s       | Wider vision, enemy alerts               | Yes           |
| Chapel    | ⛪   | 1   | 400g 100w 100s  | +25% profession XP                       | Yes           |
| Dock      | ⚓   | 2   | 300g 200w       | +30% fishing speed, boat travel          | Yes           |
| Farm      | 🌾   | 3   | 200g 50w        | Passive food & herbs every 10 min        | Yes           |
| House     | 🏠   | 6   | 100g 50w        | +50 storage                              | Yes           |

### Building Placement

Buildings are placed via click-to-place UI:
1. Click Build button in top toolbar
2. Select a building from the panel
3. Click on the island map to place

Placement validates:
- Keep requirement (most buildings need Keep first)
- Max count per building type
- World coordinate bounds

### Building Bonuses

Bonuses stack and scale with building level (Lv2 = 1.25×, Lv3 = 1.5×):
- **Multiplicative**: harvest speed, XP, gold sell price
- **Additive**: hero slots, storage, passive resources, fishing speed
- **Boolean**: dock (boat travel), tower (vision)

## Camera Controls (RTS Style)

### Camera Movement

| Input         | Action                            |
|---------------|-----------------------------------|
| WASD / Arrows | Pan camera                        |
| Mouse edge    | Pan when cursor at screen edge    |
| Scroll wheel  | Zoom in/out                       |
| Middle mouse  | Drag to pan                       |
| Space         | Center on character               |

### Camera Bounds

```typescript
const cameraConfig = {
  minZoom: 0.5,
  maxZoom: 2.0,
  panSpeed: 10,
  edgePanMargin: 50, // pixels from screen edge
  edgePanSpeed: 5,
};
```

### Selection

| Input         | Action                            |
|---------------|-----------------------------------|
| Left click    | Select unit/building              |
| Right click   | Move to / interact with           |
| Drag box      | Multi-select units                |
| Double click  | Select all of type                |

## Island Database Schema

```typescript
export const homeIslands = pgTable("home_islands", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull().unique(),
  name: text("name").default("Home Island"),
  seed: integer("seed").notNull(), // For procedural generation
  sizeX: integer("size_x").default(32),
  sizeY: integer("size_y").default(32),
  terrainData: jsonb("terrain_data").$type<number[][]>(),
  discoveredAreas: jsonb("discovered_areas").$type<boolean[][]>(),
  createdAt: bigint("created_at", { mode: "number" }),
});
```

## Character on Island

### Player Resources

Track account-level resources gathered from islands:

```typescript
export const playerResources = pgTable("player_resources", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  accountId: varchar("account_id"),
  gold: integer("gold").default(0),
  resources: jsonb("resources").$type<Record<string, number>>(),
});
```

### Example Resources

```json
{
  "gold": 1500,
  "resources": {
    "copper_ore": 45,
    "iron_ore": 23,
    "silverleaf": 12,
    "oak_log": 67,
    "raw_fish": 15
  }
}
```

## World Connection

### Harbor / Dock

The harbor connects the island to the world map:
- Access world map sailing system
- Repair and upgrade ships
- Hire crew members
- Trade with passing merchants

See `docs/SAILING.md` for world map navigation.

## API Endpoints

```
GET  /api/islands/:accountId          - Get home island
PUT  /api/islands/:accountId/terrain  - Update terrain (admin)
GET  /api/islands/:id/nodes           - Get resource nodes
POST /api/islands/:id/gather          - Gather from node
GET  /api/islands/:id/buildings       - Get buildings
POST /api/islands/:id/buildings       - Place building
PUT  /api/islands/:id/buildings/:bid  - Upgrade building
```

## Implementation Files

### Backend
| File | Purpose |
|------|---------|
| `shared/schema.ts` | homeIslands, resourceNodes, playerResources tables |
| `server/storage.ts` | Island CRUD operations |
| `server/routes.ts` | Island and resource API endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/pages/island.tsx` | Main island page (pathfinding, buildings, movement tick) |
| `client/src/components/IslandSidebar.tsx` | Heroes/activity sidebar |
| `client/src/components/IslandTileRenderer.tsx` | Tile-based rendering |
| `client/src/components/IslandChat.tsx` | AI companion chat |
| `client/src/components/IslandCutscene.tsx` | Island intro cutscene |
| `client/src/components/HarvestPopup.tsx` | Harvest feedback popup |
| `client/src/lib/islandSystem.ts` | Island game logic, node generation, animals |
| `client/src/lib/islandTileGrid.ts` | 200×200 tile grid generation, heightmap, walkability |
| `client/src/lib/islandPathfinder.ts` | A* pathfinding with binary heap, 8-directional |
| `client/src/lib/heroMovementSystem.ts` | Step-by-step hero movement along waypoint paths |
| `client/src/lib/islandBuildings.ts` | Building types, sprites, bonuses, placement validation |
| `client/src/lib/islandCamera.ts` | RTS camera pan/zoom/transform |
| `client/src/lib/characterState.ts` | Character stamina/state management |

### Sprite Assets
| Directory | Contents |
|-----------|----------|
| `public/sprites/resources/` | Resource node sprites |
| `public/sprites/buildings/` | Building sprites (legacy market) |
| `public/sprites/miniworld/Buildings/` | MiniWorld building sprites (Wood, Cyan, Lime, Purple, Red) |
| `public/sprites/heroes/` | Hero character sprites |
