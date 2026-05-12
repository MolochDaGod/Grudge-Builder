# API Routes: Phase 1 Character Creation System

Complete REST API documentation for the 6-step character creation flow.

## Overview

The character creation system involves three main phases:
- **Phase 1 (Steps 1-4)**: Ephemeral UI - race/class/stats/avatar selection, culminates in character cNFT mint
- **Phase 2 (Step 5)**: Island preview - generates initial island state, shows stats
- **Phase 3 (Step 6)**: Island finalization - allows rerolls, then commits with island cNFT mint

---

## Character Routes

### POST /api/characters

**Create a new character** with race, class, stats, and sprite configuration.

**Request:**
```json
{
  "name": "string",
  "raceId": "string",
  "classId": "string",
  "attributes": {
    "strength": number,
    "agility": number,
    "constitution": number,
    "wisdom": number,
    "intelligence": number,
    "charisma": number
  },
  "spriteConfig": {
    "skinTone": 0-360,
    "hairColor": 0-360,
    "armorColor": 0-360,
    "clothColor": 0-360
  },
  "skipAvatarGeneration": boolean (optional)
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountId": "uuid",
  "name": "string",
  "raceId": "string",
  "classId": "string",
  "attributes": { ... },
  "spriteConfig": { ... },
  "cnftId": "string (Crossmint transaction ID)",
  "cnftAddress": "string (Solana address or null if minting)",
  "avatarUrl": "string or null",
  "createdAt": number (epoch milliseconds)
}
```

**Status Codes:**
- `200` - Character created successfully
- `400` - Validation error (bad input)
- `403` - No character creation tokens available
- `500` - Server error

**Notes:**
- Consumes one character creation token from account
- Sprite customization is persisted as HSL values (0-360° hue, 0-100% sat/light)
- Character cNFT is minted synchronously (or async with status tracking)
- Avatar generation is optional (can be AI-generated or user-uploaded)

---

### GET /api/characters

**List all characters for current user.**

**Response:**
```json
[
  { character object },
  ...
]
```

**Status Codes:**
- `200` - Success
- `401` - Authentication required
- `500` - Server error

---

### GET /api/characters/:id

**Get a specific character by ID.**

**Response:**
```json
{
  "id": "uuid",
  ...
}
```

**Status Codes:**
- `200` - Success
- `404` - Character not found
- `403` - Character does not belong to current user
- `401` - Authentication required

---

### PATCH /api/characters/:id

**Update character metadata** (name, attributes, sprite config, etc.).

**Request:**
```json
{
  "name": "string (optional)",
  "attributes": { ... } (optional),
  "spriteConfig": { ... } (optional),
  "equipment": { ... } (optional)
}
```

**Response:**
```json
{
  "id": "uuid",
  ...updated fields...
}
```

**Status Codes:**
- `200` - Success
- `404` - Character not found
- `403` - Character does not belong to current user
- `401` - Authentication required

---

### DELETE /api/characters/:id

**Delete a character permanently.**

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200` - Success
- `404` - Character not found
- `403` - Character does not belong to current user
- `401` - Authentication required

---

## Island Generation Routes

### POST /api/characters/:id/generate-island

**Generate a preview island for a character** (Step 5: Island Intro).

Called automatically when player enters Step 5 of character creator.

**Request:**
```json
{
  "characterId": "uuid (optional, derived from URL)"
}
```

**Response:**
```json
{
  "homeIslandId": "uuid",
  "islandState": {
    "id": "uuid",
    "characterId": "uuid",
    "seed": "uuid",
    "name": "string",
    "mapStyle": "string",
    "nodes": [
      {
        "id": "uuid",
        "type": "ore|stone|gem|wood|hemp|herb|crystal",
        "x": number,
        "y": number,
        "drops": { itemId: quantity },
        "tier": "common|rare|epic|legendary",
        "profession": "mining|woodcutting|herbalism"
      }
    ],
    "animals": [
      {
        "id": "uuid",
        "type": "hare|fox|deer|boar",
        "x": number,
        "y": number,
        "hp": number
      }
    ],
    "terrainZones": [
      {
        "type": "mountain|forest|field|shore|water|clearing",
        "bounds": { x, y, width, height }
      }
    ],
    "campPosition": { x: number, y: number },
    "stats": {
      "nodeCount": number,
      "animalCount": number,
      "terrainZoneCount": number,
      "resourceBreakdown": { type: count, ... }
    }
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Character not found
- `403` - Character does not belong to current user
- `409` - Character already has a validated island
- `401` - Authentication required

**Notes:**
- Uses character UUID as deterministic seed for island generation
- Island state is ephemeral (not yet validated/committed)
- Multiple calls with same character ID return identical island structure
- Next step (Step 6) allows rerolls with different seeds before commitment

---

### POST /api/islands/:id/regenerate

**Reroll island to generate new resource placement** (Step 6: Island Reroll).

Generates a fresh island with a new seed, different structure but same character.

**Request:**
```json
{
  "islandId": "uuid"
}
```

**Response:**
```json
{
  "islandState": {
    "id": "uuid",
    "seed": "uuid (new seed)",
    "nodes": [...],
    "animals": [...],
    "terrainZones": [...],
    "stats": { ... }
  },
  "rerollCount": number
}
```

**Status Codes:**
- `200` - Success
- `404` - Island not found
- `403` - Island does not belong to current user
- `429` - Too many rerolls (if limit enforced)
- `401` - Authentication required

**Notes:**
- Same character, different island seed
- Old state is discarded (not persisted)
- Can be called multiple times until "Find Land & Launch" is clicked
- No limit on rerolls (player can generate as many variations as desired)

---

### POST /api/island/initialize

**Finalize island and mint cNFT** (Step 6: Island Finalization / "Find Land & Launch").

Commits the current ephemeral island to the database and mints it as a Solana cNFT.

**Request:**
```json
{
  "characterId": "uuid",
  "islandId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Island initialized successfully",
  "homeIsland": true,
  "homeIslandId": "uuid",
  "island": {
    "id": "uuid",
    "accountId": "uuid",
    "seed": "uuid",
    "cnftId": "string (Crossmint transaction ID)",
    "cnftAddress": "string or null (if minting)",
    "validatedAt": number (epoch milliseconds),
    "nodes": [...],
    "animals": [...],
    "state": { ... }
  },
  "mint": {
    "actionId": "string (Crossmint action ID)",
    "mintAddress": "string or null"
  }
}
```

**Status Codes:**
- `200` - Success (island already initialized or newly initialized)
- `400` - Validation error (invalid island state)
- `404` - Character or island not found
- `403` - Island does not belong to current user
- `409` - Island already validated (idempotent: returns existing island)
- `401` - Authentication required

**Notes:**
- **Idempotent**: Calling multiple times returns the same result
- Validates island state structure (nodes exist, terrain zones defined, camp position within bounds)
- Mints island cNFT (Crossmint API call)
- Sets `validatedAt` timestamp to mark commitment
- Records cNFT transaction in `islandNFTs` table
- Client redirects to `/rts-grudge` after success

---

### GET /api/island

**Get player's home island** (read current island state).

**Response:**
```json
{
  "id": "uuid",
  "accountId": "uuid",
  "seed": "uuid",
  "name": "string",
  "mapStyle": "string",
  "state": {
    "nodes": [...],
    "animals": [...],
    "terrainZones": [...],
    ...
  },
  "validatedAt": number or null,
  "cnftId": "string or null",
  "cnftAddress": "string or null"
}
```

**Status Codes:**
- `200` - Success
- `401` - Authentication required
- `500` - Server error

---

### GET /api/island/status

**Check if player has completed island initialization cutscene.**

**Response:**
```json
{
  "homeIsland": boolean,
  "homeIslandId": "uuid or null",
  "homeIslandMintActionId": "string or null"
}
```

**Status Codes:**
- `200` - Success
- `401` - Authentication required

---

### PATCH /api/island

**Update island metadata** (name, mapStyle, thumbnailUrl, etc.).

**Request:**
```json
{
  "name": "string (optional)",
  "mapStyle": "string (optional)",
  "thumbnailUrl": "string (optional)"
}
```

**Response:**
```json
{
  "id": "uuid",
  ...updated fields...
}
```

**Status Codes:**
- `200` - Success
- `404` - Island not found
- `401` - Authentication required

---

## Character Abilities & Skills

### GET /api/characters/:id/abilities

**Get all abilities/skills for a character.**

**Response:**
```json
[
  {
    "id": "uuid",
    "characterId": "uuid",
    "skillId": "uuid",
    "upgradeLevel": number,
    "aquiredAt": number
  },
  ...
]
```

**Status Codes:**
- `200` - Success
- `404` - Character not found
- `403` - Character does not belong to current user
- `401` - Authentication required

---

## Island NFT Routes

### GET /api/island-nfts

**Get all island NFTs for current account.**

**Response:**
```json
[
  {
    "id": "uuid",
    "islandId": "uuid",
    "accountId": "uuid",
    "status": "minting|minted|failed",
    "mintAddress": "string or null",
    "crossmintActionId": "string",
    "ownerWalletAddress": "string or null",
    "isCompressed": boolean,
    "createdAt": number
  },
  ...
]
```

**Status Codes:**
- `200` - Success
- `401` - Authentication required

---

### POST /api/island-nfts/:nftId/check-status

**Check minting status of an island cNFT.**

**Response:**
```json
{
  "status": "minting|minted|failed",
  "mintAddress": "string or null",
  "transactionSignature": "string or null",
  "createdAt": number,
  "updatedAt": number
}
```

**Status Codes:**
- `200` - Success
- `404` - NFT not found
- `401` - Authentication required

---

## Data Models

### Character
```typescript
interface Character {
  id: string; // UUID
  userId: string; // Links to user account
  accountId: string; // Links to account
  homeIslandId: string | null; // Links to home_islands
  name: string;
  raceId: string; // "human" | "orc" | "elf" | "dwarf" | "barbarian" | "undead"
  classId: string; // "warrior" | "mage" | "ranger" | "shapeshifter"
  level: number;
  xp: number;
  hp: number;
  energy: number;
  attributes: {
    strength: number;
    agility: number;
    constitution: number;
    wisdom: number;
    intelligence: number;
    charisma: number;
  };
  spriteConfig: {
    skinTone: number; // 0-360 (hue)
    hairColor: number; // 0-360
    armorColor: number; // 0-360
    clothColor: number; // 0-360
  };
  equipment: Record<string, string | null>;
  inventory: Array<{ itemId: string; quantity: number; tier?: number }>;
  cnftId: string | null; // Crossmint transaction ID
  cnftAddress: string | null; // Solana mint address
  avatarUrl: string | null;
  createdAt: number; // epoch milliseconds
}
```

### HomeIsland
```typescript
interface HomeIsland {
  id: string; // UUID
  accountId: string;
  seed: string; // UUID used for deterministic generation
  name: string;
  mapStyle: string; // "iron" | "fantasy" | "tactical" | "night"
  mapImageUrl: string | null;
  thumbnailUrl: string | null;
  state: IslandState; // Full JSONB state
  cnftId: string | null; // Crossmint transaction ID
  cnftAddress: string | null; // Solana mint address
  validatedAt: number | null; // Epoch milliseconds, null until committed
  createdAt: number;
  updatedAt: number;
}

interface IslandState {
  id: string;
  characterId: string;
  seed: string;
  name: string;
  mapStyle: string;
  nodes: ResourceNode[];
  animals: Animal[];
  terrainZones: TerrainZone[];
  campPosition: { x: number; y: number };
  clearings: Clearing[];
  stats: {
    nodeCount: number;
    animalCount: number;
    terrainZoneCount: number;
    resourceBreakdown: Record<string, number>;
  };
}

interface ResourceNode {
  id: string;
  type: "ore" | "stone" | "gem" | "wood" | "hemp" | "herb" | "crystal";
  x: number;
  y: number;
  drops: Record<string, number>;
  tier: "common" | "rare" | "epic" | "legendary";
  profession: "mining" | "woodcutting" | "herbalism";
}

interface Animal {
  id: string;
  type: "hare" | "fox" | "deer" | "boar";
  x: number;
  y: number;
  hp: number;
  species?: string;
}

interface TerrainZone {
  type: "mountain" | "forest" | "field" | "shore" | "water" | "clearing";
  bounds: { x: number; y: number; width: number; height: number };
}
```

### SpriteConfig
```typescript
interface SpriteConfig {
  skinTone: number; // HSL hue (0-360°)
  hairColor: number; // HSL hue (0-360°)
  armorColor: number; // HSL hue (0-360°)
  clothColor: number; // HSL hue (0-360°)
}
```

---

## Error Handling

All error responses follow this format:
```json
{
  "error": "string",
  "details": { ... } (optional, for validation errors)
}
```

### Common Status Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (permission denied or insufficient resources)
- `404` - Not Found
- `409` - Conflict (idempotent operation already completed)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Testing with curl

### Create a character
```bash
curl -X POST http://localhost:3000/api/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Throk",
    "raceId": "orc",
    "classId": "warrior",
    "attributes": {
      "strength": 18,
      "agility": 10,
      "constitution": 16,
      "wisdom": 12,
      "intelligence": 10,
      "charisma": 14
    },
    "spriteConfig": {
      "skinTone": 120,
      "hairColor": 30,
      "armorColor": 200,
      "clothColor": 250
    }
  }'
```

### Generate island for character
```bash
curl -X POST http://localhost:3000/api/characters/CHARACTER_ID/generate-island \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Reroll island
```bash
curl -X POST http://localhost:3000/api/islands/ISLAND_ID/regenerate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Finalize island
```bash
curl -X POST http://localhost:3000/api/island/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "characterId": "CHARACTER_ID",
    "islandId": "ISLAND_ID"
  }'
```

---

## Implementation Checklist

### Backend
- [ ] Add `spriteConfig`, `cnftId`, `cnftAddress` columns to characters table
- [ ] Add `cnftId`, `cnftAddress`, `validatedAt` columns to homeIslands table
- [ ] Create `/server/utilities/islandGeneration.ts` with seeded RNG and island generation logic
- [ ] Implement POST `/api/characters/:id/generate-island` route
- [ ] Implement POST `/api/islands/:id/regenerate` route
- [ ] Enhance POST `/api/characters` to store `spriteConfig` and mint character cNFT
- [ ] Enhance POST `/api/island/initialize` to validate state and mint island cNFT
- [ ] Update storage helper functions (createCharacter, updateCharacter, getOrCreateHomeIsland, etc.)
- [ ] Add character-to-island relationship validation
- [ ] Test deterministic island generation (same seed = same output)

### Frontend
- [ ] Integrate step-1-race.tsx, step-2-class.tsx, step-3-stats.tsx, step-4-avatar.tsx, step-5-island-intro.tsx, step-6-island-gen.tsx
- [ ] Wire CharacterCreatorState through all 6 steps
- [ ] Test ephemeral state (steps 1-4 use local state, no DB until Step 4 mint)
- [ ] Test island preview transitions
- [ ] Test reroll functionality
- [ ] Test navigation and error handling

### Testing
- [ ] Unit test seeded RNG (same seed = same sequence)
- [ ] Unit test island generation determinism
- [ ] Integration test character creation flow (all 6 steps)
- [ ] Integration test island generation and reroll
- [ ] Integration test island finalization and cNFT minting
- [ ] Manual test on localhost
- [ ] Staging test before production deploy

---

## Deployment Notes

1. **Database Migrations First**: Run ALTER TABLE commands before deploying code
2. **Backward Compatibility**: Existing characters without `spriteConfig` should have defaults applied
3. **cNFT Minting**: Ensure Crossmint API is configured and rates are handled
4. **Determinism**: Verify seeded RNG matches between client and server (same seed = same island)
5. **Monitoring**: Log island generation stats and cNFT minting status for debugging

