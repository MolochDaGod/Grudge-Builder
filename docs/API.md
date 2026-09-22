# Grudge Warlords API Documentation

> **Docs index:** [DOCS-INDEX.md](./DOCS-INDEX.md) · **UUID systems:** [UUID_SYSTEM.md](./UUID_SYSTEM.md) · **ICON assets (9,724):** [ObjectStore API & UUID Guide](../../ObjectStore/docs/API-AND-UUID-GUIDE.md)

## Base URL

All API endpoints are prefixed with `/api/`. In production, Vercel rewrites proxy these to the Grudge backend:

| Frontend route | Backend destination |
|----------------|--------------------|
| `/api/auth/*` | `id.grudge-studio.com/auth/*` |
| `/api/account/*` | `account.grudge-studio.com/*` |
| `/api/game/*` | `api.grudge-studio.com/*` |
| `/api/wallet/*` | `api.grudge-studio.com/api/wallet/*` |
| `/api/nfts/*` | `api.grudge-studio.com/api/nfts/*` |
| `/api/assets/*` | `assets.grudge-studio.com/*` |

See `vercel.json` for the full rewrite map.

## Authentication (Grudge ID)

All auth flows through **id.grudge-studio.com** (Grudge ID service). Every user gets a unique Grudge ID.

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Username + password login |
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/puter` | Puter SDK auth (Google, guest) |
| POST | `/api/auth/wallet` | Solana wallet connect |
| POST | `/api/auth/verify` | Validate session token |
| GET | `/api/auth/discord/start` | Begin Discord OAuth |
| GET | `/api/auth/google/start` | Begin Google OAuth |
| GET | `/api/auth/github/start` | Begin GitHub OAuth |

### Auth Response
```json
{
  "success": true,
  "token": "jwt...",
  "sessionToken": "jwt...",
  "grudgeId": "GRDG-xxxx",
  "username": "Player",
  "user": {
    "id": 1,
    "grudgeId": "GRDG-xxxx",
    "username": "Player",
    "walletAddress": "...",
    "serverWalletAddress": "..."
  }
}
```

### Using Auth Token
All protected endpoints require the JWT token:
```
Authorization: Bearer <token>
X-Session-Token: <token>
```

### SSO (Cross-App)
Grudge ID supports SSO via URL params: `?sso_token=<jwt>&grudge_id=<id>&grudge_username=<name>`

### Legacy Admin Mode (dev only)
- `x-admin-mode: true` header for local development testing
- Admin heroes: RacaLVIN (Dwarf Worg), Groown (Barbarian Ranger), Moloch (Undead Mage)

### Admin playtest
- `POST /api/admin/grant-character-tokens` — body `{ userId, amount? }`, header `X-Admin-Key` (or dev mode)
- `POST /api/island/boss-clear` — body `{ zoneX, zoneY }`, grants +1 character token

Full guide: [PLAYTEST.md](./PLAYTEST.md)

---

## Characters

### GET /api/characters
Get all characters for the current user.

**Response:** `Character[]`

### GET /api/characters/:id
Get a specific character by ID.

**Parameters:**
- `id` (path): Character UUID

**Response:** `Character` plus progress meta:
```json
{
  "id": "…",
  "progressRevision": 14,
  "progressSchemaVersion": 1
}
```

See [CHARACTER_PROGRESS_SSOT.md](./CHARACTER_PROGRESS_SSOT.md).

### POST /api/characters
Create a new hero on the **Railway Postgres SSOT**. Canonical creator for the whole fleet (Foundry at character.grudge-studio.com, GCS, Warlords, fleet SDK).

**Identity (canonical):**
| Field | Meaning |
|-------|---------|
| `id` | Postgres UUID (row PK) — never invent client-side |
| `grudgeCode` | Human-facing `GRDG-{RACE3}{CLASS3}-{suffix}` (e.g. `GRDG-HUMWAR-W7ZXH4`) |
| `name` | **Player-chosen display name** (not the code) |

Server always resolves identity via `shared/characterIdentity.ts` (`resolveHeroIdentity`):
- Generates `grudgeCode` when omitted (or regenerates invalid codes)
- If `name` looks like a GRDG code and no code was sent, treats it as the code and defaults the display name to `Warlord`
- Mirrors code into `model3d.grudgeDisplayId` / `model3d.grudgeCode` for 3D clients

**Warlords tokens:** Creating a `gameEra: "warlords"` character consumes one `character_tokens` from the account (default 1 on signup). Returns `403` when tokens are `0`. See [PLAYTEST.md](./PLAYTEST.md) for unblock steps. Local dev (`NODE_ENV=development`) and `DEV_UNLIMITED_CHARACTER_TOKENS=true` skip the check. Character Studio saves (`model3d.grudge6` or `sourceUrl` containing character.grudge-studio.com) also skip the token gate.

**Request Body:**
```json
{
  "name": "Ragnar",
  "grudgeCode": "GRDG-HUMWAR-W7ZXH4",
  "raceId": "human | orc | elf | dwarf | barbarian | undead",
  "classId": "warrior | mage | ranger | worg | shapeshifter",
  "gameEra": "warlords",
  "attributes": {
    "Strength": 10,
    "Intellect": 10,
    "Vitality": 10,
    "Dexterity": 10,
    "Endurance": 10,
    "Wisdom": 10,
    "Agility": 10,
    "Tactics": 10
  },
  "equipment": {},
  "inventory": [],
  "model3d": {
    "grudge6": true,
    "sourceUrl": "https://character.grudge-studio.com/viewer",
    "grudgeDisplayId": "GRDG-HUMWAR-W7ZXH4"
  }
}
```

Aliases accepted: `race`/`class`, `grudgeDisplayId`, `grudgeUuid`, `model3d.grudgeDisplayId`.

**Response:** `Character` (includes `id`, `name`, `grudgeCode`, …)

### PATCH /api/characters/:id
Update a character. Progress-shaped bodies are validated (mastery pool, no inventory, revision).

**Parameters:**
- `id` (path): Character UUID

**Headers (progress writes):**
- `If-Match` or `X-Progress-Revision` — last known `progressRevision` (optional but recommended)

**Request Body (progress):** see [CHARACTER_PROGRESS_SSOT.md](./CHARACTER_PROGRESS_SSOT.md)  
Includes: `expectedRevision`, `idempotencyKey`, `schemaVersion`, `professionLevels`, `weaponMastery`, `attributes`, `selectedSkills`, `equipment`, …  
**Do not** send account `inventory` here.

**Response:** `Character` + `progressRevision` + `progressSchemaVersion`  
**409:** `progress_revision_conflict` when `expectedRevision` mismatches  
**400:** `invalid_weapon_mastery` when pool/ranks invalid

### POST /api/characters/:id/progress
Preferred explicit progress write. Same validation and concurrency rules as progress-shaped PATCH.

**Request Body:** progress payload (`schemaVersion`, `expectedRevision`, …)  
**Response:** same as PATCH progress success

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

## Icons & ObjectStore (ICON UUIDs)

Grudge Warlords resolves all UI icons through the **ObjectStore `ICON-*` registry** on R2 CDN.

| Resource | URL |
|----------|-----|
| Icon registry | `https://objectstore.grudge-studio.com/api/v1/icon-registry.json` |
| Path index | `https://objectstore.grudge-studio.com/api/v1/icon-path-index.json` |
| Integration manifest | `https://objectstore.grudge-studio.com/api/v1/assets-api.json` |
| CDN base | `https://assets.grudge-studio.com/game-assets/icons/...` |

### Client usage (GrudgeBuilder)

```typescript
import { resolveIconUrl, iconOnError } from '@/lib/iconResolver';

<img src={resolveIconUrl(item.iconUrl, { category: item.type, name: item.name })} onError={iconOnError} />
```

### ObjectStore REST (no auth required)

Base: `https://objectstore.grudge-studio.com`

| Method | Endpoint |
|--------|----------|
| GET | `/api/v1/icons?category=skill&limit=50` |
| GET | `/api/v1/icons/search?q=fire` |
| GET | `/api/v1/icons/:grudgeUuid` |
| GET | `/api/v1/icons/by-path?path=/icons/sigils/strength.png` |

Full UUID matrix (ICON vs char_ vs slot-tier vs HERO/EQIP): see [ObjectStore API & UUID Guide](../../ObjectStore/docs/API-AND-UUID-GUIDE.md).

---

## Grudge UUID (slot-tier items)

Runtime item instances use the structured format `SLOT-TIER-ITEMID-TIMESTAMP-COUNTER`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/uuid/generate` | Generate one UUID from slot + tier + itemId |
| POST | `/api/uuid/apply-to-items` | Preview batch assignment |
| POST | `/api/uuid/commit` | Persist to database |
| POST | `/api/island/resolve-drops` | Stamp island loot with UUIDs |

See [UUID_SYSTEM.md](./UUID_SYSTEM.md) for slot codes, tier codes, and parsing.

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
