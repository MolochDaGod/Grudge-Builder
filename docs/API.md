# Grudge Warlords API Documentation

## Base URL
All API endpoints are prefixed with `/api/`

## Authentication
The app uses a dual-account system with "admin" and "guest" userIds for complete data isolation.

### Admin Mode
- **Login**: Click the key icon in the footer, enter admin password
- **Header**: Client sends `x-admin-mode: true` header when in admin mode
- **Server**: `getUserId(req)` helper routes requests to the correct account
- **Ownership**: All mutation routes verify ownership before allowing access

### Admin Heroes (Auto-seeded on first login)
- RacaLVIN (Dwarf Worg, Level 5) - melee specialist
- Groown (Barbarian Ranger, Level 3) - ranged combat
- Moloch (Undead Mage, Level 4) - spell caster

---

## Characters

### GET /api/characters
Get all characters for the current user.

**Response:** `Character[]`

### GET /api/characters/:id
Get a specific character by ID.

**Parameters:**
- `id` (path): Character UUID

**Response:** `Character`

### POST /api/characters
Create a new character. Automatically generates an AI avatar.

**Request Body:**
```json
{
  "name": "string",
  "raceId": "human | orc | elf | dwarf | barbarian | undead",
  "classId": "warrior | mage | ranger | shapeshifter",
  "attributes": {
    "Strength": 0,
    "Intellect": 0,
    "Vitality": 0,
    "Dexterity": 0,
    "Endurance": 0,
    "Wisdom": 0,
    "Agility": 0,
    "Tactics": 0
  },
  "equipment": {},
  "inventory": []
}
```

**Response:** `Character`

### PATCH /api/characters/:id
Update a character.

**Parameters:**
- `id` (path): Character UUID

**Request Body:** Partial `Character` object

**Response:** `Character`

### DELETE /api/characters/:id
Delete a character.

**Parameters:**
- `id` (path): Character UUID

**Response:** `{ success: true }`

### POST /api/characters/:id/regenerate-avatar
Regenerate the AI avatar for a character.

**Parameters:**
- `id` (path): Character UUID

**Response:** `Character` (with new avatarUrl)

---

## Party

### GET /api/party
Get the current user's party composition.

**Response:**
```json
{
  "userId": "string",
  "characterIds": ["uuid1", "uuid2", "uuid3"]
}
```

### POST /api/party
Update party composition.

**Request Body:**
```json
{
  "characterIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:** `Party`

---

## Resources

### GET /api/resources
Get player's gathered resources.

**Response:**
```json
{
  "userId": "string",
  "resources": {
    "wood": 100,
    "stone": 50,
    "iron_ore": 25
  }
}
```

### POST /api/resources
Update player's resources.

**Request Body:**
```json
{
  "resources": {
    "wood": 100,
    "stone": 50
  }
}
```

**Response:** `PlayerResources`

### GET /api/resource-nodes/:nodeId
Get a specific resource node's state.

**Parameters:**
- `nodeId` (path): Node identifier

**Response:**
```json
{
  "nodeId": "string",
  "lastGathered": 1704067200000
}
```

### POST /api/resource-nodes/:nodeId/gather
Mark a resource node as gathered.

**Parameters:**
- `nodeId` (path): Node identifier

**Request Body:**
```json
{
  "lastGathered": 1704067200000
}
```

---

## Game Content

### GET /api/game/races
Get all playable races.

**Response:** `Race[]`

### GET /api/game/classes
Get all character classes.

**Response:** `Class[]`

### GET /api/game/sprites
Get all sprite sheet definitions.

**Response:** `SpriteSheet[]`

### GET /api/game/sprites/:id
Get a specific sprite sheet.

**Parameters:**
- `id` (path): Sprite sheet ID

**Response:** `SpriteSheet`

### GET /api/game/dungeons
Get all dungeon templates.

**Response:** `DungeonTemplate[]`

### GET /api/game/dungeons/:id
Get a specific dungeon template.

**Parameters:**
- `id` (path): Dungeon ID

**Response:** `DungeonTemplate`

---

## Dungeon Generation

### POST /api/generate-dungeon
Generate a procedural dungeon floor using AI.

**Request Body:**
```json
{
  "floor": 1,
  "theme": "crypt"
}
```

**Response:**
```json
{
  "width": 20,
  "height": 15,
  "tiles": [[0, 1, 0], ...],
  "spawnPoint": { "x": 2, "y": 2 },
  "exitPoint": { "x": 17, "y": 12 },
  "enemies": [{ "type": "skeleton", "x": 5, "y": 5 }],
  "treasures": [{ "x": 10, "y": 8 }]
}
```

**Tile IDs:**
- 0 = floor (walkable)
- 1 = wall (blocked)
- 2 = water (slows movement)
- 3 = door
- 4 = stairs (exit)
- 5 = decoration

---

## Aseprite Files

### GET /api/aseprite/list
List available Aseprite sprite files.

**Response:**
```json
[
  { "name": "Wizard", "path": "/sprites/..." }
]
```

### GET /api/aseprite/parse/:filename
Parse an Aseprite file for animation data.

**Parameters:**
- `filename` (path): Aseprite filename

**Response:** Parsed animation data with frames, tags, and palette

---

## Data Types

### Character
```typescript
interface Character {
  id: string;                    // UUID
  userId: string;
  name: string;
  raceId: string;
  classId: string;
  level: number;
  xp: number;
  hp: number;
  energy: number;
  attributes: Record<string, number>;
  equipment: Record<string, string | null>;
  inventory: Array<{ itemId: string; quantity: number }>;
  professionLevels: Record<string, { level: number; xp: number }>;
  revivalTime: number | null;
  avatarUrl: string | null;
  unspentAttributePoints: number;
  skillPoints: number;
  skillLoadouts: Record<string, SkillLoadout>;
  createdAt: number;
}
```

### Race
```typescript
interface Race {
  id: string;
  name: string;
  faction: "Crusade" | "Legion" | "Fabled";
  description: string;
  baseStats: Record<string, number>;
  spriteSet: string;
}
```

### Class
```typescript
interface Class {
  id: string;
  name: string;
  description: string;
  role: string;
  baseStats: Record<string, number>;
  spriteSetOverride?: string;
  startingWeapon: string;
}
```
