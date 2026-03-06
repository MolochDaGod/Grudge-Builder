# Grudge Warlords Backend Documentation

## Technology Stack
- **Runtime:** Node.js with Express
- **Language:** TypeScript (ESM modules)
- **Database:** PostgreSQL with Drizzle ORM
- **Build:** esbuild for server bundling
- **AI:** OpenAI API for avatar/dungeon generation

## Admin Account System
- **getUserId(req)**: Helper function routes requests to "admin" or "guest" based on `x-admin-mode` header
- **Ownership Validation**: All mutation routes verify `userId` matches before access
- **Admin Login**: POST `/api/admin/login` validates password and auto-seeds admin heroes
- **Admin Heroes**: RacaLVIN (Dwarf Worg), Groown (Barbarian Ranger), Moloch (Undead Mage)

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
├── schema.ts         # Drizzle schema definitions
└── definitions/      # Static game data
```

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
DATABASE_URL          # PostgreSQL connection string (auto-set by Replit)
PGHOST               # PostgreSQL host
PGPORT               # PostgreSQL port
PGUSER               # PostgreSQL user
PGPASSWORD           # PostgreSQL password
PGDATABASE           # PostgreSQL database name

# AI Integration (managed by Replit)
AI_INTEGRATIONS_OPENAI_API_KEY
AI_INTEGRATIONS_OPENAI_BASE_URL
```

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

### Production
- esbuild bundles server code
- Vite builds optimized frontend
- Static file serving from Express

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
| File | Purpose |
|------|---------|
| `server/services/crossmintWallet.ts` | Crossmint custodial wallets |
| `server/services/nftMinting.ts` | Compressed NFT minting |
