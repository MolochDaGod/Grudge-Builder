# Dungeon System Reference

## Overview

The dungeon crawler system provides procedurally generated dungeons with fog of war, turn-based combat, and AI-controlled enemies. Characters explore tile-based maps, fight monsters, collect loot, and clear dungeon objectives.

## Dungeon Types

| Dungeon Type  | Environment   | Difficulty | Floors |
|---------------|---------------|------------|--------|
| Crypt         | Undead, dark  | Easy       | 1-3    |
| Cave          | Beasts, ores  | Easy       | 1-3    |
| Ruins         | Mixed enemies | Medium     | 3-5    |
| Fortress      | Organized foes| Hard       | 5-7    |
| Abyss         | Demons, chaos | Very Hard  | 7-10   |

## Procedural Generation

### Map Generation

Dungeons are generated using a combination of:
1. Room placement algorithms
2. Corridor connections
3. Enemy spawning rules
4. Loot distribution

### Tile Types

| Tile     | Code | Description                    |
|----------|------|--------------------------------|
| Floor    | `.`  | Walkable space                 |
| Wall     | `#`  | Impassable barrier             |
| Door     | `D`  | Openable passage               |
| Stairs   | `>`  | Exit to next floor             |
| Chest    | `C`  | Contains loot                  |
| Trap     | `T`  | Hidden hazard                  |
| Spawn    | `S`  | Player start position          |

### Room Templates

| Template     | Size    | Contents                       |
|--------------|---------|--------------------------------|
| Empty        | 5×5     | Nothing special                |
| Small        | 7×7     | 1-2 enemies                    |
| Medium       | 10×10   | 2-4 enemies, chest             |
| Large        | 15×15   | 4-6 enemies, multiple chests   |
| Boss         | 20×20   | Boss encounter                 |

## Fog of War

### Visibility System

Players have limited visibility based on:
- Line of sight from current position
- Sight range (default: 5 tiles)
- Blocked by walls and doors

### Fog States

| State      | Appearance | Description                    |
|------------|------------|--------------------------------|
| Hidden     | Black      | Never seen                     |
| Explored   | Dim        | Previously seen, not visible   |
| Visible    | Full       | Currently in view              |

### Visibility Calculation

```typescript
// For each tile within sight range
for (dx = -sightRange; dx <= sightRange; dx++) {
  for (dy = -sightRange; dy <= sightRange; dy++) {
    if (hasLineOfSight(playerX, playerY, x + dx, y + dy)) {
      setVisible(x + dx, y + dy);
    }
  }
}
```

## Combat System

See `docs/COMBAT.md` for detailed combat mechanics.

### Turn Order

1. Player party acts (controlled by player)
2. Enemies act (AI-controlled)
3. Effects/status updates
4. Repeat

### AI Behavior

Enemies use behavior trees with priorities:

| Priority | Behavior          | Condition                    |
|----------|-------------------|------------------------------|
| 1        | Attack player     | Adjacent to player           |
| 2        | Move toward player| Can see player               |
| 3        | Investigate       | Heard noise                  |
| 4        | Patrol            | Default behavior             |
| 5        | Idle              | No other action              |

### Enemy Types

| Type       | Behavior                              |
|------------|---------------------------------------|
| Melee      | Rush to close range, attack           |
| Ranged     | Keep distance, shoot projectiles      |
| Caster     | Use spells, avoid melee               |
| Tank       | Guard choke points, high defense      |
| Boss       | Special abilities, multiple phases    |

## Monster Database

### Monster Schema

```typescript
export const monsters = pgTable("monsters", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  health: integer("health").notNull(),
  damage: integer("damage").notNull(),
  defense: integer("defense").notNull(),
  abilities: jsonb("abilities").$type<string[]>(),
  lootTable: jsonb("loot_table").$type<LootEntry[]>(),
  spriteUrl: text("sprite_url"),
  behavior: text("behavior").default("melee"),
});
```

### Example Monsters

| Monster     | Level | HP   | Damage | Behavior |
|-------------|-------|------|--------|----------|
| Skeleton    | 1     | 50   | 8      | Melee    |
| Goblin      | 2     | 40   | 10     | Melee    |
| Orc         | 5     | 100  | 18     | Melee    |
| Dark Mage   | 8     | 60   | 25     | Caster   |
| Dragon      | 15    | 500  | 50     | Boss     |

## Dungeon Runs

### Dungeon Run Tracking

```typescript
export const dungeonRuns = pgTable("dungeon_runs", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id"),
  dungeonId: text("dungeon_id").notNull(),
  partyIds: jsonb("party_ids").$type<string[]>(),
  currentFloor: integer("current_floor").default(1),
  mapState: jsonb("map_state").$type<MapState>(),
  status: text("status").default("active"), // active, completed, failed
  startedAt: bigint("started_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
});
```

### Run States

| Status    | Description                           |
|-----------|---------------------------------------|
| active    | Currently in progress                 |
| completed | Successfully cleared all floors       |
| failed    | Party wiped, run ended                |
| abandoned | Player left dungeon                   |

## Loot System

### Loot Tables

Each monster has a loot table defining drop chances:

```json
{
  "lootTable": [
    { "itemId": "gold", "minQty": 5, "maxQty": 15, "chance": 1.0 },
    { "itemId": "iron_ore", "minQty": 1, "maxQty": 3, "chance": 0.3 },
    { "itemId": "iron_sword", "minQty": 1, "maxQty": 1, "chance": 0.05 }
  ]
}
```

### Chest Loot

| Chest Type  | Contents                              |
|-------------|---------------------------------------|
| Common      | Gold, materials, consumables          |
| Rare        | Equipment, rare materials             |
| Boss        | Guaranteed rare+ equipment            |

## Sprite System

### 4-Directional Sprites

Characters and enemies use 4-directional sprite sheets:

| Direction | Frames | Animation        |
|-----------|--------|------------------|
| Down      | 0-3    | Walking south    |
| Left      | 4-7    | Walking west     |
| Up        | 8-11   | Walking north    |
| Right     | 12-15  | Walking east     |

### Canvas Renderer

The dungeon is rendered using HTML5 Canvas:

```typescript
// Render layers (back to front)
1. Floor tiles
2. Explored fog (dim overlay)
3. Objects (chests, stairs)
4. Enemies
5. Player party
6. Hidden fog (black overlay)
7. UI elements
```

## API Endpoints

```
GET  /api/dungeons                  - List available dungeons
GET  /api/dungeons/:id              - Get dungeon details
POST /api/dungeon-runs              - Start new dungeon run
GET  /api/dungeon-runs/:id          - Get run state
PUT  /api/dungeon-runs/:id/move     - Move party
PUT  /api/dungeon-runs/:id/action   - Perform action (attack, open, etc.)
```

## Implementation Files

### Backend
| File | Purpose |
|------|---------|
| `shared/schema.ts` | Dungeon runs, monsters, dungeonTemplates tables |
| `server/storage.ts` | Dungeon CRUD operations |
| `server/routes.ts` | Dungeon generation API endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/pages/dungeon-tiled.tsx` | Main dungeon page |
| `client/src/components/DungeonGame.tsx` | Dungeon game logic |
| `client/src/components/TiledDungeonGame.tsx` | Tiled map renderer |
| `client/src/components/MiniWorldRenderer.tsx` | MiniWorld sprite renderer |
| `client/src/components/TileRenderer.tsx` | Tile rendering utilities |
| `client/src/lib/dungeonGenerator.ts` | Procedural generation |
| `client/src/lib/miniworldTileset.ts` | MiniWorld tileset config |
| `client/src/lib/dungeonSpriteConfig.ts` | Dungeon sprite mappings |

### Sprite Assets
| Directory | Contents |
|-----------|----------|
| `public/sprites/miniworld/` | MiniWorld RPG sprites |
| `public/sprites/dampdungeons/` | Dungeon tileset |
| `public/sprites/enemies/` | Enemy sprites |
