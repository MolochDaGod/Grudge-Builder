# GRUDGE Database Best Practices

This document outlines best practices for using the PostgreSQL database in GRUDGE Warlords and related GRUDGE games.

> **Fleet SSOT (2026):** Player state = **Railway Postgres** only. Definitions = **ObjectStore / info**. Binaries = **R2**. Asset index = **D1**.  
> Full multi-store map + backups: [grudge-dev-tool · Databases · sharing · backups](https://grudge-warlords.github.io/grudge-dev-tool/database-backups-sharing.html)  
> Skill: **`grudge-production-wiring`**. DB connection map (no secrets): `shared/fleet/dbConnections.ts`.

## Database Architecture

### Data Source Strategy (production)

| Data Type | Source | Reasoning |
|-----------|--------|-----------|
| **Player Data** (characters, bag, island, wallet) | **Railway Postgres** | Transactional SSOT; fleet REST `/api/*` |
| **Game definitions** (items, recipes, weapons) | **ObjectStore / info JSON** | Designer-editable, git-backed share surface |
| **Meshes / icons / audio** | **R2 CDN** | Immutable binaries; not BYTEA in Postgres |
| **Asset search index** | **Cloudflare D1** | Index only — never bag/XP |
| **Cross-app shared bag** | Same Railway account APIs | One login, one bag, many eras/games |
| **Realtime room state** | Per-game Railway (e.g. Multiverse `/api/mv`) | Ephemeral; not character ownership |
| **Session cache** | In-memory / Puter KV | Never sole truth |

Legacy note: older rows below may mention seeding static content into Postgres for local ARPG tools — **do not** treat that as fleet definition SSOT.

### Table Categories

1. **Core Game Data** (seeded once, rarely changes)
   - `races`, `classes` - Character creation options
   - `items` - Weapons, armor, materials, consumables
   - `spells`, `skills` - Combat abilities
   - `monsters` - Enemy definitions

2. **Player Data** (changes frequently)
   - `characters` - Player characters with attributes
   - `accounts`, `accountInventory` - Account-level shared storage
   - `parties` - Character groupings
   - `dungeonRuns`, `combatLogs` - Session data

3. **Asset References** (metadata for sprites/audio)
   - `spriteSheets`, `spriteManifest` - Animation definitions
   - `dungeonTemplates`, `tilesets` - Map configurations

## Seeding the Database

### Quick Start

```bash
# Run seeding via API (development mode - no auth needed)
curl -X POST http://localhost:5000/api/admin/seed

# Check current database stats
curl http://localhost:5000/api/admin/seed/status

# In production, include admin key header
curl -X POST http://localhost:5000/api/admin/seed \
  -H "X-Admin-Key: your-admin-key"
```

**Security Note**: Admin endpoints are protected:
- **Development**: Allowed automatically (NODE_ENV=development)
- **Production**: Requires `X-Admin-Key` header matching `ADMIN_API_KEY` env var

### What Gets Seeded

| Category | Source File | Approx Count |
|----------|-------------|--------------|
| Races | seed.ts (inline) | 6 |
| Classes | seed.ts (inline) | 4 |
| Weapons | shared/definitions/weaponsData.ts | 96 |
| Armor | shared/definitions/equipmentData.ts | 150 |
| Materials | shared/definitions/materials.ts | 123 |
| Misc Items | shared/definitions/items.ts | 25 |
| Foods | shared/definitions/foods.ts | 240 (30 recipes x 8 tiers) |
| Spells | shared/definitions/spells.ts | 15-30 |
| Skills | shared/definitions/skills.ts | 21-42 |
| Monsters | shared/definitions/monsters.ts | 16-48 |

*Note: Counts may vary based on `onConflictDoNothing()` behavior. Use `/api/admin/seed/status` for actual counts.*

### Seeding Best Practices

1. **Use `onConflictDoNothing()`** - Prevents duplicate key errors on re-seeding
2. **Seed in dependency order** - Base tables before tables with foreign keys
3. **Log progress** - Console output helps track seeding progress
4. **Provide stats** - Return counts after seeding for verification

## Query Patterns

### Efficient Item Queries

```typescript
// Get all weapons of a specific type
const swords = await db.select()
  .from(items)
  .where(and(
    eq(items.type, 'weapon'),
    eq(items.subType, 'Sword')
  ));

// Get items by tier range
const midTierItems = await db.select()
  .from(items)
  .where(and(
    gte(items.tier, 3),
    lte(items.tier, 5)
  ));
```

### Character with Related Data

```typescript
// Get character with equipment details
const characterWithGear = await db.select()
  .from(characters)
  .leftJoin(items, eq(characters.equippedWeaponId, items.id))
  .where(eq(characters.id, characterId));
```

### Batch Operations

```typescript
// Insert multiple items efficiently
await db.insert(items)
  .values(itemsArray)
  .onConflictDoNothing();

// Update multiple records
await db.update(characters)
  .set({ level: sql`level + 1` })
  .where(eq(characters.userId, userId));
```

## Storage Interface Pattern

The `server/storage.ts` file provides a clean abstraction layer:

```typescript
interface IStorage {
  // Characters
  getCharacter(id: string): Promise<Character | undefined>;
  getCharactersByUser(userId: string): Promise<Character[]>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: string, updates: Partial<Character>): Promise<Character>;
  deleteCharacter(id: string): Promise<void>;
  
  // Game Data
  getRaces(): Promise<Race[]>;
  getClasses(): Promise<GameClass[]>;
  getItems(filters?: ItemFilters): Promise<Item[]>;
  // ... etc
}
```

### Benefits
- **Testability** - Easy to mock for unit tests
- **Abstraction** - Routes don't know about Drizzle details
- **Validation** - Centralized ownership/security checks
- **Consistency** - Single source of truth for data access

## Security Best Practices

### Ownership Validation

```typescript
// Always validate ownership before operations
async function validateCharacterOwnership(characterId: string, userId: string): Promise<boolean> {
  const character = await db.select()
    .from(characters)
    .where(and(
      eq(characters.id, characterId),
      eq(characters.userId, userId)
    ))
    .limit(1);
  return character.length > 0;
}
```

### Safe Updates

```typescript
// Only update allowed fields
const allowedFields = ['name', 'attributes', 'equipment'];
const sanitizedUpdate = Object.fromEntries(
  Object.entries(updates).filter(([key]) => allowedFields.includes(key))
);
```

### Transaction Safety

```typescript
// Use transactions for multi-table operations
await db.transaction(async (tx) => {
  await tx.insert(characters).values(characterData);
  await tx.insert(accountInventory).values(starterItems);
  await tx.update(accounts).set({ gold: sql`gold - 100` });
});
```

## Type Safety

### Drizzle-Zod Integration

```typescript
// Schema definition
export const items = pgTable("items", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  tier: integer("tier").notNull().default(1),
  stats: jsonb("stats").$type<Record<string, number>>(),
});

// Validation schema
export const insertItemSchema = createInsertSchema(items).omit({ id: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;
```

### Route Validation

```typescript
app.post("/api/items", async (req, res) => {
  const result = insertItemSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  const item = await storage.createItem(result.data);
  res.json(item);
});
```

## Performance Tips

### Indexing Strategy

```sql
-- Common query patterns should have indexes
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_tier ON items(tier);
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_account_inventory_account ON account_inventory(account_id);
```

### Query Optimization

1. **Select only needed columns** - Avoid `SELECT *` when possible
2. **Use proper limits** - Always limit pagination queries
3. **Batch reads** - Combine related queries when possible
4. **Cache reference data** - Game content rarely changes

### Connection Management

- Drizzle handles connection pooling automatically
- Don't create new connections per request
- Use the shared `db` instance from `server/db.ts`

## Migration Guidelines

### Schema Changes

1. **Never change primary key types** - Breaks existing data
2. **Use `npm run db:push`** - Safely syncs schema
3. **Add columns as nullable first** - Then backfill, then add NOT NULL
4. **Test migrations locally** - Before applying to production

### Safe Column Addition

```typescript
// Step 1: Add nullable column
newColumn: text("new_column"),

// Step 2: Run db:push
// Step 3: Backfill existing rows
// Step 4: Add NOT NULL constraint if needed
```

## API Endpoints for Database

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/seed` | POST | Run database seeding |
| `/api/admin/seed/status` | GET | Get seeding statistics |
| `/api/game/races` | GET | All races |
| `/api/game/classes` | GET | All classes |
| `/api/game/dungeons` | GET | All dungeons |

## Debugging

### Check Table Counts

```bash
curl http://localhost:5000/api/admin/seed/status
```

Response:
```json
{
  "success": true,
  "stats": {
    "races": 6,
    "classes": 4,
    "items": 628,
    "spells": 52,
    "skills": 84,
    "monsters": 45,
    "spriteSheets": 10,
    "dungeonTemplates": 5,
    "tilesets": 1
  }
}
```

### Common Issues

1. **Duplicate key errors** - Use `onConflictDoNothing()` in seeds
2. **Foreign key violations** - Seed parent tables first
3. **Type mismatches** - Check JSONB column types match TypeScript
4. **Missing data** - Re-run seed if tables are empty

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Railway / server only — never `VITE_*`) |
| `DATABASE_PUBLIC_URL` | Public proxy URL for local dump tools |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Individual connection params |

## Sharing scopes (cross-game)

| Scope | Shared? | API |
|-------|---------|-----|
| Account bag / GBUX / wallet | **Yes** across eras | `/api/account/*`, `/api/inventory/*`, `/api/wallet/*` |
| Character XP / equipment / progress | **No** — per character UUID | `/api/characters/:id`, `…/progress` (+ revision) |
| Definitions | **Yes** (read-only JSON) | ObjectStore / info |
| Meshes | **Yes** (CDN keys) | `assets.grudge-studio.com` |

Games **never** open Postgres from the browser. Use same-origin `/api/*` rewrites (Vercel) or explicit CORS (Puter).

## Backups (PlanetScale-inspired)

Adapted from [Massively parallel Postgres backups](https://planetscale.com/blog/massively-parallel-postgres-backups):

| Rule | Practice |
|------|----------|
| Make it boring | Scheduled dump + meta time **T** + offsite artifact |
| Don't thrash primary | Dump off HTTP path; cap parallel workers |
| Parallelism | Table-parallel logical dumps today; WAL/base backup when RPO requires |
| Prove restore | Weekly load into Docker / staging Postgres |
| Object storage | Optional R2 prefix `backups/postgres/grudge-api/<stamp>/` |
| Never git | `backups/` gitignored — no player dumps in commits |

```powershell
# From grudge-dev-tool (fleet ops tool)
$env:DATABASE_URL = "<Railway public DATABASE_URL>"
npm i -D pg   # once
npm run backup:postgres
# → backups/<stamp>/meta.json + tables/*.jsonl.gz
```

After schema migrations: dump immediately. Room Railways (Multiverse, GRUDOX) are **not** a substitute for this player dump.

Canonical runbook: https://grudge-warlords.github.io/grudge-dev-tool/database-backups-sharing.html

## Related Documentation

- `README.md` - Project architecture overview
- `shared/schema.ts` - Full database schema definitions
- `shared/fleet/dbConnections.ts` / `storage.ts` - Fleet store map
- `docs/CANONICAL_DATA_LAYER.md` - One-truth stack
- `server/storage.ts` - Storage interface implementation
- grudge-dev-tool docs: Databases · sharing · backups
