# Grudge Warlords Backend Documentation

## Technology Stack
- **Runtime:** Node.js with Express
- **Language:** TypeScript (ESM modules)
- **Database:** PostgreSQL with Drizzle ORM
- **Build:** esbuild for server bundling
- **Auth:** Grudge ID (JWT) via id.grudge-studio.com
- **AI:** OpenAI API for avatar/dungeon generation
- **Hosting:** Railway (Docker) — deployed via Railway, frontend via Vercel

## Authentication (Grudge ID)

All auth flows through **id.grudge-studio.com** (Grudge ID service). The frontend proxies via Vercel rewrites (`/api/auth/*`).

- **Grudge ID**: Every user gets a unique Grudge ID on first login
- **Auth methods**: Discord, Google, GitHub, Puter (guest), Solana wallet, username/password
- **SSO**: Cross-app single sign-on between grudgewarlords.com and other Grudge Studio apps
- **Token**: JWT stored as `grudge_auth_token`, sent via `Authorization: Bearer <token>`
- **Auto-provisioning**: Backend creates server-side Solana wallet + Puter cloud storage per account

### Legacy Admin System (dev only)
- `x-admin-mode` header for local development testing
- Admin heroes: RacaLVIN (Dwarf Worg), Groown (Barbarian Ranger), Moloch (Undead Mage)

---

## Project Structure

```
server/
├── index.ts          # Server entry point
├── routes.ts         # API route definitions
├── storage.ts        # Database operations (IStorage interface)
├── seed.ts           # Database seed script
└── vite.ts           # Vite dev server integration

shared/
├── schema.ts              # Drizzle schema definitions
├── characterProgress.ts   # Progress SSOT (revision, mastery validation)
├── characterIdentity.ts   # GRDG codes
└── definitions/           # Static game data (weaponMastery, etc.)
```

### Character progress writes (Railway)

Canonical contract: **[CHARACTER_PROGRESS_SSOT.md](./CHARACTER_PROGRESS_SSOT.md)**.

| Endpoint | Role |
|----------|------|
| `POST /api/characters/:id/progress` | Preferred progress write (revision + mastery validation) |
| `PATCH /api/characters/:id` | Same validation when body is progress-shaped; admin fields otherwise |
| `GET /api/characters/:id` | Includes `progressRevision` / `progressSchemaVersion` |

Progress meta lives in `skill_loadouts.__progress` (`revision`, `schemaVersion`, idempotency ring). Account inventory must use `/api/account/*`, never character PATCH.

---

## Database Schema

### Tables

#### users
```sql
id          VARCHAR PRIMARY KEY (UUID)
username    TEXT UNIQUE NOT NULL
password    TEXT NOT NULL
```

#### characters
```sql
id                      VARCHAR PRIMARY KEY (UUID)
user_id                 VARCHAR NOT NULL
name                    TEXT NOT NULL
race_id                 TEXT NOT NULL
class_id                TEXT NOT NULL
level                   INTEGER DEFAULT 1
xp                      INTEGER DEFAULT 0
hp                      INTEGER DEFAULT 100
energy                  INTEGER DEFAULT 50
attributes              JSONB
equipment               JSONB
inventory               JSONB
profession_levels       JSONB
revival_time            BIGINT
avatar_url              TEXT
unspent_attribute_points INTEGER DEFAULT 0
skill_points            INTEGER DEFAULT 1
skill_loadouts          JSONB
created_at              BIGINT
```

#### parties
```sql
id              VARCHAR PRIMARY KEY (UUID)
user_id         VARCHAR UNIQUE NOT NULL
character_ids   JSONB (string array)
updated_at      BIGINT
```

#### resource_nodes
```sql
id              VARCHAR PRIMARY KEY (UUID)
user_id         VARCHAR NOT NULL
node_id         TEXT NOT NULL
last_gathered   BIGINT
```

#### player_resources
```sql
id          VARCHAR PRIMARY KEY (UUID)
user_id     VARCHAR UNIQUE NOT NULL
resources   JSONB (key-value pairs)
updated_at  BIGINT
```

#### dungeon_runs
```sql
id                  VARCHAR PRIMARY KEY (UUID)
user_id             VARCHAR NOT NULL
dungeon_id          TEXT NOT NULL
floor_level         INTEGER DEFAULT 1
seed                INTEGER NOT NULL
status              TEXT DEFAULT 'active'
party_state         JSONB
explored_tiles      JSONB
defeated_monsters   JSONB
collected_loot      JSONB
started_at          BIGINT
updated_at          BIGINT
```

---

## Storage Interface

The `IStorage` interface in `server/storage.ts` defines all database operations:

```typescript
interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Characters
  getCharacters(userId: string): Promise<Character[]>;
  getCharacter(id: string): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: string, updates: Partial<Character>): Promise<Character>;
  deleteCharacter(id: string): Promise<void>;
  
  // Party
  getParty(userId: string): Promise<Party | undefined>;
  updateParty(userId: string, characterIds: string[]): Promise<Party>;
  
  // Resources
  getPlayerResources(userId: string): Promise<PlayerResources | undefined>;
  updatePlayerResources(userId: string, resources: Record<string, number>): Promise<PlayerResources>;
  getResourceNode(userId: string, nodeId: string): Promise<ResourceNode | undefined>;
  updateResourceNode(userId: string, nodeId: string, lastGathered: number): Promise<ResourceNode>;
  
  // Game Content
  getRaces(): Promise<Race[]>;
  getClasses(): Promise<CharacterClass[]>;
  getSpriteSheets(): Promise<SpriteSheet[]>;
  getSpriteSheet(id: string): Promise<SpriteSheet | undefined>;
  getDungeonTemplates(): Promise<DungeonTemplate[]>;
  getDungeonTemplate(id: string): Promise<DungeonTemplate | undefined>;
}
```

---

## AI Integration

### Avatar Generation
Uses OpenAI's image generation API (`gpt-image-1`):
- Generates unique cartoon-style portraits
- Incorporates race/class descriptions
- Adds random unique features and lighting
- Saves to `public/avatars/`

### Dungeon Generation
Uses OpenAI's chat API (`gpt-4o-mini`):
- Generates procedural dungeon layouts
- Returns JSON with tiles, enemies, treasures
- Falls back to deterministic generation on error

---

## Environment Variables

```bash
# Database (Railway PostgreSQL)
DATABASE_URL          # PostgreSQL connection string
PGHOST               # PostgreSQL host
PGPORT               # PostgreSQL port
PGUSER               # PostgreSQL user
PGPASSWORD           # PostgreSQL password
PGDATABASE           # PostgreSQL database name

# Auth (Grudge ID)
JWT_SECRET           # JWT signing secret (shared with id.grudge-studio.com)
DISCORD_CLIENT_ID    # Discord OAuth app ID
DISCORD_CLIENT_SECRET# Discord OAuth secret
GOOGLE_CLIENT_ID     # Google OAuth
GITHUB_CLIENT_ID     # GitHub OAuth

# AI Integration
OPENAI_API_KEY       # OpenAI API key for avatar/dungeon generation

# Crossmint Wallet & NFT (checked in order: SERVER > SECRET > API)
CROSSMINT_SERVER_API_KEY  # Crossmint server API key
CROSSMINT_SECRET_KEY      # Crossmint secret key (fallback)
CROSSMINT_API_KEY         # Crossmint API key (fallback)
CROSSMINT_USE_STAGING     # 'true' for staging environment
CROSSMINT_COLLECTION_ID   # Collection ID (default: 'default-solana')
CROSSMINT_ISLAND_CNFT     # Island cNFT template ID (optional)

# Frontend overrides (Vercel env)
VITE_OBJECT_STORE_URL   # Override ObjectStore base URL
VITE_ASSET_CDN_URL      # Override R2 CDN URL
VITE_COLYSEUS_URL       # Direct Colyseus WS (e.g. ws://74.208.174.62:2567)

# Playtest / dev
DEV_UNLIMITED_CHARACTER_TOKENS  # Skip Warlords character token gate on Railway
ADMIN_API_KEY                   # X-Admin-Key for /api/admin/* in production
```

---

## Character tokens & playtesting

Warlords character creation checks `accounts.character_tokens` (see `shared/schema.ts`). Boss clears and admin grants increment the counter; `POST /api/admin/reset-account` restores one token.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/island/boss-clear` | +1 token (JWT) |
| `POST /api/admin/grant-character-tokens` | Admin bulk grant |
| `npm run dev` | Token check skipped in development |

Details: [PLAYTEST.md](./PLAYTEST.md)

---

## Database Commands

```bash
# Push schema changes to database
npm run db:push

# Generate migrations (if needed)
npm run db:generate

# View database studio
npx drizzle-kit studio
```

---

## API Route Pattern

Routes follow a thin controller pattern:
1. Validate request with Zod schemas
2. Call storage interface methods
3. Return JSON response

```typescript
app.post("/api/characters", async (req, res) => {
  try {
    const validated = insertCharacterSchema.parse(req.body);
    const character = await storage.createCharacter(validated);
    res.json(character);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create character" });
  }
});
```

---

## Static File Serving

Express serves static files from:
- `public/` - Sprites, avatars, UI assets
- `client/dist/` - Built frontend (production)

---

## Development vs Production

### Development
- Vite dev server with HMR
- Direct TypeScript execution via tsx
- Hot module replacement for frontend
- Local Express server at :5000

### Production
- Frontend: Vite builds → Vercel (static SPA)
- Backend: Railway Docker containers (grudge-api-production.up.railway.app)
- API proxied through Vercel rewrites (see vercel.json)
- Assets served from Cloudflare R2 CDN (assets.grudge-studio.com)
- Game data from ObjectStore (Cloudflare Pages)
- DNS/CDN managed via Cloudflare

---

## Implementation Files

### Core Backend
| File | Purpose |
|------|---------|
| `server/index.ts` | Application entry point |
| `server/routes.ts` | All REST API endpoints |
| `server/storage.ts` | Database operations (IStorage interface) |
| `server/db.ts` | Drizzle database connection |
| `server/vite.ts` | Vite dev server integration |

### Schema & Types
| File | Purpose |
|------|---------|
| `shared/schema.ts` | All Drizzle ORM table definitions |
| `shared/attributeSystem.ts` | Combat and stat calculations |
| `shared/grudgeUUID.ts` | UUID generation and parsing |

### Services
| File | Purpose |
|------|---------|
| `server/googleSheets.ts` | Google Sheets data integration |
| `server/gameDataSeeder.ts` | Database seeding from definitions |
| `server/aseprite-reader.ts` | Aseprite file parsing |
| `server/openai.ts` | OpenAI API integration |

### Wallet & NFT
|| File | Purpose |
||------|---------|
|| `server/services/crossmintWallet.ts` | **Canonical** Crossmint service — wallets, character + island cNFT minting, metadata updates, status polling |
|| `server/services/walletHelper.ts` | Server-side wallet management — Grudge ID generation, email derivation, account wallet init |
|| `server/services/nftMinting.ts` | Re-exports NFTMintingService from spriteGeneration/ |
|| `server/services/nftMetadata.ts` | NFT metadata generation |
|| `server/spriteGeneration/services/nftMinting.ts` | NFT minting orchestration — DB operations, mint flow |
|| `server/spriteGeneration/services/crossmintWallet.ts` | Re-export of canonical `server/services/crossmintWallet.ts` |
