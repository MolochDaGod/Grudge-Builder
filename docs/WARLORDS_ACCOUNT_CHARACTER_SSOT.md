# Warlords account ↔ character ownership SSOT

**Status:** Product law for `era=warlords` on `grudgewarlords.com`  
**Updated:** 2026-08-02  
**Authority:** Railway Postgres (L-PLAYER) — never D1 / Puter KV / localStorage as truth  
**Schema:** `shared/schema.ts` · Progress wire: `shared/characterProgress.ts` · APIs: `/api/characters/*`, `/api/account/*`, `/api/island/*`, `/api/nfts/*`

**Related**

| Doc | Role |
|-----|------|
| [WARLORDS_MMO_PRODUCT.md](./WARLORDS_MMO_PRODUCT.md) | What grudgewarlords.com *is* |
| [CHARACTER_PROGRESS_SSOT.md](./CHARACTER_PROGRESS_SSOT.md) | Progress revision / mastery validation |
| [CNFT_ESCROW_OWNERSHIP.md](./CNFT_ESCROW_OWNERSHIP.md) | Escrow-first mint, play without claim |
| [WARLORDS_CNFT_MARKETPLACE_SSOT.md](./WARLORDS_CNFT_MARKETPLACE_SSOT.md) | One wallet / collection / templates |
| [HOME_ISLAND_PIPELINE_CANONICAL.md](./HOME_ISLAND_PIPELINE_CANONICAL.md) | Seed, assets, 1024 m runtime |
| [CAMP_CLAIM_UNITS.md](./CAMP_CLAIM_UNITS.md) | Claim flag + F1–F5 garrison |
| [MULTIPLAYER_DEPLOY_PATTERN.md](./MULTIPLAYER_DEPLOY_PATTERN.md) | Home-island host / visit rooms |
| [CHARACTER_ERAS.md](./CHARACTER_ERAS.md) | warlords vs voxel roster split |

---

## 1. One-sentence law

**Each Warlords hero owns its own attributes, stats, class skills, weapon mastery, weapon skills, and profession levels. The Grudge account owns the shared bag, resources, claimed camps, home island, and island cNFT — visible and usable by every `era=warlords` character on that account. Chain cNFTs mirror ownership; Railway remains game truth.**

Same Grudge login can also hold **voxel** heroes for Mine-Loader — those are a **separate play roster**. Warlords heroes never load as Mine-Loader explorers.

---

## 2. Scope matrix (do not blur)

### 2.1 Character-scoped (per hero UUID)

| Domain | Storage | API | Notes |
|--------|---------|-----|-------|
| **Attributes** (8 core) | `characters.attributes` | `POST /api/characters/:id/progress` · `PATCH /api/characters/:id` | STR/VIT/… · unspent: `unspent_attribute_points` |
| **Combat stats** | `level`, `xp`, `hp`, `energy` | same | Level ~20 default on Foundry create |
| **Class skill tree** | `selected_skills`, `skill_loadouts`, `skill_points` | progress | Picks + loadout slots per weapon type |
| **Weapon mastery ranks / charms** | `weapon_skill_selections.mastery` (`allocations`, `sockets`) | progress | Cap `MASTERY_POOL_CAP` = 100 |
| **Weapon skill level** | `weapon_skill_level` (1–100) | progress | Global weapon skill rank on this hero |
| **Weapon skill hotkeys** | `weapon_skill_selections` per weapon | progress | hotkey2 / hotkey3 bindings |
| **Equipped weapon** | `equipped_weapon_id` | progress / equip | From weapon catalog |
| **Equipment on body** | `characters.equipment` | progress | Slots worn by **this** hero |
| **Profession levels** | `characters.profession_levels` **and/or** `character_professions` | progress · profession routes | **Per character** — miner A ≠ miner B |
| **Appearance** | `model_3d`, race/class, `avatar_url` | create / PATCH | grudge6 kit |
| **Identity codes** | `id` (UUID), `grudge_code` | read | UUID is join key; GRDG is display |
| **Hero cNFT row** | `character_nfts` (`character_id` unique) | `/api/nfts/*` | Mint non-blocking; claim optional |
| **Active for era** | `active_for_era`, `game_era='warlords'` | roster | One active warlords hero recommended for play entry |

**Never share across heroes:** attributes, profession XP, mastery ranks, class skill picks, weapon skill level, worn equipment.

### 2.2 Account-scoped (shared by **all** Warlords heroes on the account)

| Domain | Storage | API | Notes |
|--------|---------|-----|-------|
| **Inventory (bag)** | `account_inventory` | `GET/PUT /api/account/inventory` | SSOT bag — **not** `characters.inventory` jsonb (legacy cache only) |
| **Resources / mats stack** | `account_resources` | `GET/PUT /api/account/resources` | One row per `account_id` |
| **Wallet / GBUX path** | `accounts.walletAddress`, resources | wallet + claim fees | **One Solana wallet per account** |
| **Claimed camps** | Camp runtime `ownerAccountId` + island/zone state blobs | island/zone save | Claim flag binds **account**, not character |
| **Home island** | `home_islands` (`account_id` **unique**) | `/api/island/*`, `/api/islands/*` | **One home island per account** |
| **Island cNFT** | `home_islands.cnft_*` + `island_nfts` (`island_id` unique) | mint/claim | Same wallet rules as heroes |
| **Treaty groups / account chat** | `treaty_*` | social | Account-scoped social |

**Any Warlords character** on the account:

- sees the same bag and resources  
- can equip **from** the bag onto **their own** equipment slots  
- can command camps claimed by the account (when near / on the map that owns them)  
- loads the **same** home island (`home_islands.account_id`)

Optional bind: `account_inventory.bound_to_character_id` — if set, item is still account-rowed but only usable by that hero; default `null` = all heroes.

### 2.3 Explicit anti-patterns

| Bad | Good |
|-----|------|
| Write bag into `PATCH /api/characters/:id` | `/api/account/inventory` |
| Share profession XP across heroes | `character_professions` / `profession_levels` per UUID |
| Claim camp to `characterId` as sole owner key | `ownerAccountId` on claim flag |
| One home island per character | One `home_islands` row per `accountId` |
| Require cNFT claim to enter home island | Railway ownership; mint async |
| Load warlords hero on mineloader maps | Separate voxel roster only |

---

## 3. Character progression detail

### 3.1 Attributes & stats

- **8 attributes** — see [ATTRIBUTES.md](./ATTRIBUTES.md); diminishing returns after 25 points.  
- Stored: `characters.attributes` jsonb + `unspent_attribute_points`.  
- Combat derived stats (HP, energy) on character row; gear/mastery may modify at runtime from defs.  
- Writes go through progress revision (`expectedRevision` / `If-Match`) — see CHARACTER_PROGRESS_SSOT.

### 3.2 Class skills

| Field | Meaning |
|-------|---------|
| `selected_skills` | Class tree picks by tier (`Record<number, string>`) |
| `skill_loadouts` | Per-weapon-type 4-slot loadouts + upgrade levels |
| `skill_points` | Unspent class skill points |

Definitions live in shared skill trees / ObjectStore catalogs; character stores **IDs only**.

### 3.3 Weapon mastery & weapon skills

| Field | Meaning |
|-------|---------|
| `weapon_skill_level` | 1–100 mastery level for this hero |
| `weapon_skill_selections` | Per-weapon hotkeys + nested **`mastery`** |
| `weapon_skill_selections.mastery.allocations` | Rank spends per tree node |
| `weapon_skill_selections.mastery.sockets` | Charm sockets |
| `equipped_weapon_id` | Active weapon catalog id |

Server validates mastery pool (`shared/definitions/weaponMastery.ts`). Invalid → `400 invalid_weapon_mastery`.

### 3.4 Profession levels (individual per character)

| Store | Use |
|-------|-----|
| `characters.profession_levels` | Primary progress blob `{ miner: { level, xp, unlockedNodes? }, … }` |
| `character_professions` | Normalized rows + decay timestamps (`last_gain_at`, `last_decay_check_at`) |

Profession IDs include gather + craft lines (`PROFESSION_IDS` in schema).  
**Camp benches** grant profession XP to the **active character** only; materials drop into **account** bag/resources.

Progress write example:

```http
POST /api/characters/:id/progress
Authorization: Bearer <jwt>
X-Progress-Revision: 14

{
  "schemaVersion": 1,
  "expectedRevision": 14,
  "idempotencyKey": "craft:charId:recipeId:ts",
  "attributes": { "strength": 12, "vitality": 10 },
  "selectedSkills": { "1": "Power Strike" },
  "weaponMastery": { "allocations": { "swords": { "sw_honed": 2 } }, "sockets": {} },
  "professionLevels": { "miner": { "level": 3, "xp": 40 } },
  "equipment": { "weapon": "…", "head": null }
}
```

---

## 4. Shared inventory (account bag)

```
Grudge account
  └── account_inventory[]     ← all warlords heroes read/write
  └── account_resources       ← mats / currencies stack
  └── characters (era=warlords)
        ├── Hero A equipment  ← pulled from bag when equipping
        ├── Hero B equipment
        └── profession / mastery / attrs stay private
```

| Rule | Detail |
|------|--------|
| **SSOT** | `account_inventory` + `account_resources` |
| **Legacy** | `characters.inventory` jsonb — do not treat as production bag |
| **Client** | `GrudgeFleet.getAccountInventory` / `saveAccountInventory` only |
| **Craft/harvest** | Consume/produce account resources; grant profession XP to active `characterId` |
| **Equip** | Move reference from bag → `characters.equipment` for active hero |

---

## 5. Shared camps (account ownership)

Camps are **account-owned**, not character-owned.

| Piece | Law |
|-------|-----|
| **Claim flag** | Upgrade `camp_flag` sets `camp.data.ownerAccountId = <accountId>` |
| **Runtime** | `NpcCampSystem` / `CampUnitSystem` match `playerAccountId` |
| **Any warlords hero** on that account can command near owned camps (F1–F5) |
| **Garrison race** | Spawns unarmed variants of the **active** hero’s race kit |
| **Bench craft XP** | To active character; items to account bag |
| **Persistence** | Camp state rides island/zone save blobs keyed under the owning account’s maps — not per-character saves |

Flow (see CAMP_CLAIM_UNITS):

```
Place / capture camp
  → Claim flag + ownerAccountId
  → 3× race recruits
  → Bench / tower / storage upgrades
  → Any account hero near camp: F1–F5 orders
```

Hostile / NPC camps without `ownerAccountId` remain free to conquer; on claim, bind account.

---

## 6. Home island + cNFT (deploy & hosting)

### 6.1 Ownership & deploy placement

| Layer | Role | Where |
|-------|------|--------|
| **Game ownership** | Who may enter as owner, save buildings, harvest | Railway `home_islands.account_id` (unique) |
| **Play deploy** | SPA + Colyseus | **grudgewarlords.com** `/home-island` + Railway Colyseus `home_island` room |
| **Seed / state** | Procedural + placed content | `home_islands.seed` + `state` jsonb |
| **Assets** | Meshes / nature / mountains | R2 `assets.grudge-studio.com` |
| **Defs** | Spec meters / catalogs | info / ObjectStore — not player rows |
| **Design path** | Optional editor | studio editor `mode=home-island` → commit to Railway |
| **Island cNFT** | Chain mirror of island | `home_islands.cnft_*` + `island_nfts` |
| **Hero link** | Soft association | `characters.home_island_id` (hero → account island) |

**Authority order (do not reverse):** Railway row → Colyseus session → Puter KV / local cache.

cNFT mint is **non-blocking**: island is playable when Railway row exists; chain mint may lag or fail without blocking play.

### 6.2 One wallet, two templates (heroes + islands)

| Asset | Table | Template (Crossmint) |
|-------|-------|----------------------|
| Warlords hero | `character_nfts` | Warlord Pre Sale (`a9bb2c8d-…`) |
| Home island | `island_nfts` | Home Island (`18d0e641-…`) |

Both mint toward the **same account wallet** (or escrow → claim to that wallet).  
See WARLORDS_CNFT_MARKETPLACE_SSOT + CNFT_ESCROW_OWNERSHIP.

### 6.3 Hosting others (visit / invite)

Home island is the deploy surface where the **account hosts guests**.

| Rule | Value |
|------|--------|
| Room | Colyseus `home_island` |
| Room key | **Owner `accountId`** (+ island UUID) |
| Capacity | Owner + **5** visitors (`maxClients = 6`) |
| Owner powers | Harvest, place/build, island save on leave |
| Visitor powers | Presence, social, explore — **not** permanent build/harvest authority |
| Client visit URL (productize) | `/home-island?visit={ownerAccountId}&island={islandUUID}` |
| Invite UX | Dock/portal **E** → create/accept invite → join owner’s room |
| Full room | `island_full` |

```ts
// Owner
joinOrCreate('home_island', { accountId: mine, islandUUID: myIsland, … });

// Guest (any of their warlords heroes)
joinOrCreate('home_island', {
  accountId: ownerAccountId,  // room = owner's island
  islandUUID: ownerIslandId,
  isVisitor: true,
  characterName, …
});
```

Visitors bring **their own** character progress (attrs, skills, professions). They do **not** gain the host’s bag. Loot rules for visitor harvest (if enabled later) must still credit the **visitor account** or be disabled — default today: **owner-only harvest/build**.

### 6.4 Where systems “live” for deployment

| Concern | Correct place |
|---------|----------------|
| Island row + state + cnft ids | Railway `home_islands` / `island_nfts` |
| Realtime host session | Railway Colyseus, same process as grudge-api |
| Player SPA entry | **grudgewarlords.com** `/home-island` (alias `client.grudge-studio.com`) |
| Create hero then handoff | Foundry → `?characterId=` → Warlords home or play |
| Mint keys | Railway env only (`CROSSMINT_*`, wallet) |
| Asset GLBs | R2 CDN — never ship island player state to D1 |

---

## 7. Account tree (Warlords era)

```
users.grudge_id  (SSO)
  └── accounts
        ├── walletAddress (one Solana)
        ├── account_inventory[]     SHARED
        ├── account_resources       SHARED
        ├── home_islands (1)        SHARED + hosting surface
        │     └── island_nfts (0..1)
        ├── claimed camps (ownerAccountId)  SHARED
        └── characters (game_era = warlords)  ×N
              ├── attributes / stats
              ├── selected_skills / skill_loadouts / skill_points
              ├── weapon_skill_level / weapon_skill_selections
              ├── profession_levels (+ character_professions)
              ├── equipment / model_3d
              └── character_nfts (0..1)

  └── characters (game_era = voxel)  — Mine-Loader only; not this matrix’s play body
```

---

## 8. API quick map

| Need | Endpoint |
|------|----------|
| Roster | `GET /api/characters` (JWT) |
| Create warlords hero | `POST /api/characters` `{ gameEra: "warlords", … }` + async cNFT |
| Progress (attrs, skills, mastery, professions, equip) | `POST /api/characters/:id/progress` |
| Account bag | `GET/PUT /api/account/inventory` |
| Account resources | `GET/PUT /api/account/resources` |
| Home island | `GET/PATCH /api/island/*` · init routes |
| NFT list / claim | `GET /api/nfts/*` · `POST /api/nfts/:id/claim` |
| Colyseus health | `GET /api/colyseus/health` |

---

## 9. Client / fleet checklist

1. `init` → `ensureSession` → load **account** bag + **active warlords** character detail.  
2. Progress writes → `saveCharacterProgress` only (revision-safe).  
3. Inventory → account APIs only.  
4. Camp claim → pass `ownerAccountId` from session account, never invent per-character camp ownership.  
5. Home island → join room with **accountId**; visitors set `isVisitor: true`.  
6. Do not filter warlords heroes into Mine-Loader play lists.  
7. cNFT claim is optional UX after create — never gate `/home-island` or `/play` on mint success.

---

## 10. Smoke (ownership)

1. Account has heroes A and B (`era=warlords`).  
2. A spends mastery / profession XP → B unchanged.  
3. A crafts into bag → B sees same stack.  
4. A claims camp with flag → B can F1–F5 at that camp.  
5. Home island loads same seed/state for A and B.  
6. Friend visits via invite → guest mesh present; guest cannot permanent-build.  
7. Island/hero cNFT pending still allows full Railway play.

---

## 11. Changelog

| Date | Notes |
|------|--------|
| 2026-08-02 | Initial SSOT: character progression vs shared bag/camps/home island; cNFT + host-visitor deploy placement |
|
