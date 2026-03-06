# Multiplayer System Reference

## Overview

Grudge Warlords uses Colyseus as the multiplayer game server framework. Colyseus provides authoritative state synchronization, room-based matchmaking, and WebSocket transport for real-time gameplay.

## Why Colyseus

| Feature | Benefit for Grudge Warlords |
|---------|---------------------------|
| Authoritative Server | Anti-cheat compatible with UUID Ledger system |
| Room-Based Architecture | Perfect for dungeons, islands, combat arenas |
| Automatic State Sync | Efficient binary delta encoding |
| TypeScript Native | Seamless integration with existing Express backend |
| Horizontal Scaling | Redis support for growing player base |

## Architecture

### Room Types

| Room Type | Purpose | Max Players |
|-----------|---------|-------------|
| `HomeIslandRoom` | Personal island instances | 1 (owner only) |
| `PublicIslandRoom` | Shared exploration zones | 50 |
| `DungeonRoom` | Dungeon crawling sessions | 4 (party) |
| `CombatRoom` | Turn-based battle instances | 8 (4v4) |
| `SailingRoom` | World map ocean zones | 100 |
| `TradeRoom` | Player-to-player trading | 2 |

### State Schema

```typescript
import { Schema, MapSchema, type } from "@colyseus/schema";

// Player state synchronized to all clients
export class Player extends Schema {
  @type("string") id: string;
  @type("string") characterId: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") action: string = "idle";
  @type("number") health: number = 100;
  @type("number") mana: number = 50;
}

// Room state containing all players
export class RoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("number") tick: number = 0;
}
```

## Room Lifecycle

### Room Creation

```typescript
import { Room, Client } from "colyseus";
import { RoomState, Player } from "./schemas/RoomState";

export class DungeonRoom extends Room<RoomState> {
  maxClients = 4;
  
  onCreate(options: DungeonOptions) {
    this.setState(new RoomState());
    
    // Set up tick rate for updates
    this.setSimulationInterval((deltaTime) => {
      this.update(deltaTime);
    }, 1000 / 20); // 20 ticks per second
  }
  
  onJoin(client: Client, options: JoinOptions) {
    const player = new Player();
    player.id = client.sessionId;
    player.characterId = options.characterId;
    this.state.players.set(client.sessionId, player);
  }
  
  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
  }
  
  onDispose() {
    console.log("Dungeon room disposed");
  }
}
```

### Client Connection

```typescript
import { Client, getStateCallbacks } from 'colyseus.js';

const client = new Client('ws://localhost:2567');

async function joinDungeon(characterId: string) {
  const room = await client.joinOrCreate('dungeon', { characterId });
  const $ = getStateCallbacks(room);
  
  // Listen for player changes
  $(room.state).players.onAdd((player, sessionId) => {
    console.log('Player joined:', player.characterId);
  });
  
  $(room.state).players.onRemove((player, sessionId) => {
    console.log('Player left:', player.characterId);
  });
  
  return room;
}
```

## Integration with Existing Systems

### UUID Ledger Validation

All item operations flow through Colyseus for server-side validation:

```typescript
// In DungeonRoom
onMessage(client, "use_item", (data: { itemUuid: string }) => {
  // Validate UUID through ledger
  const validation = await storage.validateUuid(data.itemUuid);
  
  if (!validation || validation.currentState !== 'ACTIVE') {
    client.send("error", { message: "Invalid item" });
    return;
  }
  
  // Process item use
  this.processItemUse(client, data.itemUuid);
});
```

### Combat System Integration

Turn-based combat uses Colyseus rooms for state sync:

```typescript
export class CombatRoom extends Room<CombatState> {
  private turnOrder: string[] = [];
  private currentTurn: number = 0;
  
  onMessage(client, "attack", (data: AttackData) => {
    // Validate it's this player's turn
    if (this.turnOrder[this.currentTurn] !== client.sessionId) {
      return;
    }
    
    // Calculate damage using attributeSystem
    const damage = calculateCombatDamage(
      this.getPlayerStats(client.sessionId),
      this.getTargetStats(data.targetId)
    );
    
    // Apply damage and sync to all clients
    this.applyDamage(data.targetId, damage);
    this.nextTurn();
  });
}
```

### Dungeon Exploration

Fog of war and tile discovery synced through Colyseus:

```typescript
export class DungeonState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([TileState]) tiles: TileState[] = [];
  @type({ map: "boolean" }) discoveredTiles = new MapSchema<boolean>();
  @type({ map: MonsterState }) monsters = new MapSchema<MonsterState>();
}
```

## Server Configuration

### Express Integration

Colyseus runs alongside the existing Express server:

```typescript
import express from "express";
import { createServer } from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";

const app = express();
const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

// Register room types
gameServer.define("home_island", HomeIslandRoom);
gameServer.define("dungeon", DungeonRoom);
gameServer.define("combat", CombatRoom);
gameServer.define("sailing", SailingRoom);

// Existing Express routes
app.use("/api", apiRoutes);

server.listen(2567);
```

### Scaling with Redis

For production with multiple server instances:

```typescript
import { RedisPresence } from "@colyseus/redis-presence";
import { RedisDriver } from "@colyseus/redis-driver";

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
  presence: new RedisPresence(),
  driver: new RedisDriver(),
});
```

## Message Types

### Client → Server

| Message | Data | Description |
|---------|------|-------------|
| `move` | `{x, y}` | Request movement |
| `attack` | `{targetId, skillId}` | Execute attack |
| `use_item` | `{itemUuid}` | Use inventory item |
| `gather` | `{nodeId}` | Gather resource |
| `trade_request` | `{targetPlayerId}` | Initiate trade |

### Server → Client

| Message | Data | Description |
|---------|------|-------------|
| `error` | `{message}` | Error notification |
| `loot_drop` | `{items}` | Loot received |
| `level_up` | `{level, stats}` | Level up notification |
| `combat_result` | `{damage, effects}` | Combat outcome |

## Security Considerations

### Authentication Flow

1. User authenticates via Express API (existing system)
2. Receives session token
3. Passes token when joining Colyseus rooms
4. Room validates token server-side

```typescript
onAuth(client: Client, options: any) {
  // Validate session token
  const session = await validateSessionToken(options.token);
  if (!session) {
    return false;
  }
  return { accountId: session.accountId, characterId: options.characterId };
}
```

### Anti-Cheat Integration

- All state changes happen server-side
- UUID Ledger validates item ownership
- Movement speed caps enforced
- Damage calculations use server formulas
- No client-side authority for game state

## Performance Considerations

### Tick Rate Guidelines

| Room Type | Tick Rate | Rationale |
|-----------|-----------|-----------|
| DungeonRoom | 20 Hz | Real-time exploration |
| CombatRoom | 10 Hz | Turn-based, lower frequency |
| IslandRoom | 5 Hz | Mostly static, harvesting |
| SailingRoom | 15 Hz | Ship movement |

### State Optimization

- Use `@filter` decorators for player-specific data
- Minimize MapSchema size
- Batch state updates when possible
- Use delta encoding (built-in)

## File Structure

```
server/
├── colyseus/
│   ├── rooms/
│   │   ├── DungeonRoom.ts
│   │   ├── CombatRoom.ts
│   │   ├── IslandRoom.ts
│   │   └── SailingRoom.ts
│   ├── schemas/
│   │   ├── PlayerState.ts
│   │   ├── CombatState.ts
│   │   └── DungeonState.ts
│   └── index.ts
```

## Dependencies

```bash
npm install colyseus @colyseus/ws-transport @colyseus/schema
npm install @colyseus/redis-presence @colyseus/redis-driver  # For scaling
```

## Client SDK

```bash
npm install colyseus.js
```

## Physics Synchronization Pattern

Based on [Babylon.js + Colyseus + AmmoJS tutorial](https://doc.babylonjs.com/guidedLearning/networking/Colyseus_ammojs/).

### Concept

Physics calculations are distributed across clients:
- **Red mesh**: Local player calculates physics
- **Green mesh**: Other players receive physics data and interpolate

### Physical Object Ownership

```typescript
// Server tracks which client "owns" each physics object
export class GameRoom extends Room {
  boxData = {
    targetId: null,     // sessionId of owner
    position: null,
    quaternion: null,
  };

  onMessage("boxUpdate", (client, message) => {
    this.boxData = message;
  });

  onUpdate() {
    this.broadcast("boxUpdate", this.boxData);
  }
}
```

### Client Physics Control

```typescript
let isUpdateBox = false;

room.onMessage("boxUpdate", (message) => {
  if (message.targetId === null || message.targetId === sessionId) {
    // Local player controls physics
    isUpdateBox = true;
    box.material.diffuseColor = new Color3(1, 0, 0); // Red = local control
  } else {
    // Remote player controls physics, interpolate position
    isUpdateBox = false;
    box.material.diffuseColor = new Color3(0, 1, 0); // Green = remote
    box.position = Vector3.Lerp(box.position, message.position, 0.5);
    box.rotationQuaternion = Quaternion.Slerp(
      box.rotationQuaternion,
      message.quaternion,
      0.4
    );
  }
});
```

### Collision Transfer

When player collides with physics object, ownership transfers:

```typescript
box.physicsImpostor.registerOnPhysicsCollide(
  playerImpostor,
  function (main, collided) {
    room.send("boxUpdate", {
      targetId: sessionId,
      position: box.position,
      quaternion: box.rotationQuaternion,
    });
  }
);
```

### Application to Grudge Warlords

| Object Type | Physics Owner | Use Case |
|-------------|--------------|----------|
| Ship | Captain player | Sailing navigation |
| Loot Chest | First interactor | Island exploration |
| Combat Projectiles | Attacker | Spell effects |
| NPCs | Room host | AI movement |

## Sprite Assets

### Fireball Effects

5 color variants extracted to `/sprites/fireballs/`:
- `blue/` - Ice magic
- `green/` - Nature magic
- `purple/` - Arcane magic
- `red/` - Fire magic
- `white/` - Holy magic

Each has 8-frame animations in `stand_fp/` (first-person) and `stand_td/` (top-down).

Configuration from KeeperFX:
- Animation size: 128x128
- Speed: 190
- Damage: 30 (Magical)
- Push on hit: Yes
- Destroy on hit: Yes

### LPC Character Sprites

Extracted to `/sprites/lpc_entry/`:
- Body layers: BODY, BELT, TORSO, LEGS, FEET, HANDS, HEAD, WEAPON, BEHIND
- Animations: walk, slash, thrust, bow, hurt, spellcast
- Compatible skeleton sprites included

### Expansion Pack

Additional weapons and animations in `/sprites/expansion_pack/`:
- Longsword, rapier, long spear
- Shield cutouts
- Combat dummy with death animation

## Resources

- [Colyseus Documentation](https://docs.colyseus.io/)
- [Colyseus GitHub](https://github.com/colyseus/colyseus)
- [Schema Serialization](https://docs.colyseus.io/state/schema/)
- [Babylon.js + Colyseus Physics Tutorial](https://doc.babylonjs.com/guidedLearning/networking/Colyseus_ammojs/)
- [LPC Character Sprites](https://opengameart.org/content/lpc-character-sprites)
