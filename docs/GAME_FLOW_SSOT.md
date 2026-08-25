# Game flow SSOT — hosts, loops, and handoffs

**Status:** LAW for product + agents (2026-08).  
**Code SSOT:** `shared/definitions/warlordsProductionFlow.ts` · Foundry skill · this doc.  
**Do not invent** parallel create/play hosts.

---

## 1. Host roles (stop confusing these)

### Warlords product zone — `*.grudgewarlords.com` (prefer)

| Host | Role | Is it “the game”? |
|------|------|-------------------|
| **`grudgewarlords.com`** | Apex + **live SPA** (airship, home, maps, zones) | **Yes** |
| **`play.grudgewarlords.com`** | Branded game client (same SPA; wire DNS) | **Yes — preferred brand** |
| **`airship.` / `home.` / `map.` / `scenes.`** | Pretty hosts → SPA paths | Same SPA |
| **`craft.grudgewarlords.com`** | Craft brand (proxy Puter later) | Craft only |
| **`foundry.grudgewarlords.com`** | Optional alias → Foundry | Create only |

Full DNS map: [WARLORDS_DOMAIN_SSOT.md](./WARLORDS_DOMAIN_SSOT.md) · code `shared/fleet/warlordsDomains.ts`.

### Studio platform — `*.grudge-studio.com`

| Host | Role | Is it “the game”? |
|------|------|-------------------|
| **`id.grudge-studio.com`** | **Login only** — mint JWT, SSO return | No |
| **`character.grudge-studio.com`** | **Foundry** — create hero + 4-slot hub | No play runtime |
| **`client.grudge-studio.com`** | **Legacy** same SPA as warlords apex | Yes — legacy alias |
| **`grudge-studio.com`** | Studio **portal / marketing**. **Not** login. **Not** Warlords play SSOT | No |
| **`forge.grudge-studio.com`** | Map / scene editor | No player progress |
| **`info.grudge-studio.com`** | Definitions + ops WORLD_MAP | Not play |
| **`assets.grudge-studio.com`** | R2 binaries | Not play |

### Other

| Host | Role |
|------|------|
| **`grudgewarlords.com/craft/`** | **Canonical craft suite** (inventory, recipes, item DB) |
| **`grudge-crafting.puter.site`** | **Legacy redirect** → `grudgewarlords.com/craft/` |
| **`play.grudge.studio`** | **Deprecated / 404** — do not use for Warlords |
| **`objectstore` / info `/api/v1`** | Recipe / item JSON |

### One-line rules

1. **Login** → always `id.grudge-studio.com`.  
2. **Create hero** → `character.grudge-studio.com/foundry` (`foundry.grudgewarlords.com` 302s there).  
3. **Play 3D (Warlords era)** → **`https://grudgewarlords.com{path}`** or **`play.grudgewarlords.com{path}`** with `characterId` (not studio portal).  
4. **Craft** → `grudgewarlords.com/craft/` selects a hero; **does not create**. Same Railway bag/inventory.  
5. **Player state** → Railway Postgres only (characters, bag, inventory, professions).  
6. **`client.grudge-studio.com`** is a **legacy alias** of the same SPA — new handoffs prefer `*.grudgewarlords.com`.

### `character.*` vs Warlords play

| | `character.*` | `*.grudgewarlords.com` / play |
|--|---------------|-------------------------------|
| Create race/class | **Yes** (`/foundry`) | Redirects to Foundry |
| 4-slot pick | **Yes** (`/`) | Optional |
| Home island / zones / tutorial / airship | **No** | **Yes** |
| Stay after create | **No** — hand off | **Yes** — `?characterId=&from=gcs` |

---

## 2. Canonical player journey (happy path)

Code: `WARLORDS_PRODUCTION_FLOW` in `shared/definitions/warlordsProductionFlow.ts`.

```
┌─────────────┐     ┌──────────────────────────┐     ┌─────────────────────────────┐
│ Sign in     │────►│ Create or pick hero      │────►│ Live play (*.grudgewarlords.com) │
│ id.*        │     │ character.*/foundry  or  │     │ /airship → /home-island     │
│             │     │ character.*/ (4-slot)    │     │ → /world-map · /play zones  │
└─────────────┘     └──────────────────────────┘     │ (tutorial optional)         │
                                                      └──────────────┬──────────────┘
                                                                     │
                        ┌────────────────────────────────────────────┤
                        ▼                                            ▼
              ┌─────────────────────┐                    ┌───────────────────────┐
              │ Craft UI            │                    │ Open world / MP       │
              │ craft.* or puter    │                    │ /play?mode=zone&…     │
              │ bag = account       │                    │ Colyseus Railway      │
              │ XP = character      │                    └───────────────────────┘
              └─────────────────────┘
```

### Step table

| Step | Where | Needs auth | Needs character |
|------|--------|------------|-----------------|
| Opening / intro (optional) | grudgewarlords.com `/intro` or product landing | No | No |
| Sign in | **id.*** → return to origin | — | — |
| Create hero | **character.*** `/foundry` | Yes | No |
| My Heroes (≤4) | **character.*** `/` | Yes | Pick one |
| Airship handoff | **grudgewarlords.com** `/airship?characterId=&from=gcs` | Yes | Yes |
| Home island | **grudgewarlords.com** `/home-island` (or play.*) | Yes | Yes — **no level-20 gate** |
| World map | **grudgewarlords.com** `/world-map` | Yes | Yes |
| Open zone | **grudgewarlords.com** `/play?mode=zone&sector=…` | Yes | Yes |
| Tutorial | **grudgewarlords.com** `/tutorial` | Yes | Yes — **optional** |
| Craft | **`grudgewarlords.com/craft/`** (legacy puter redirects) | Browse free; craft needs auth + hero | Yes for XP |

**Outdated:** Docs that say “home island only at level 20” are **superseded** by `WARLORDS_HOME_ISLAND_MIN_LEVEL = 1` and Foundry L20 create defaults for *content*, not an entry gate.

---

## 3. Gameplay loops (what “counts” as progress)

### A. Auth loop
```
Any surface → id.grudge-studio.com/login?redirect_uri=<this origin>
  → sso_token / JWT → store grudge_auth_token
  → GET /api/characters?era=warlords
```
- One **grudge_id** per human.  
- Token keys: `grudge_auth_token` · `grudge_session_token` · aliases.  
- Puter guest is **not** primary Warlords identity.

### B. Create → play loop
```
Empty roster / Create
  → character.grudge-studio.com/foundry?era=warlords&returnTo=https://grudgewarlords.com/airship
  → POST Railway /api/characters (gameEra=warlords, grudge6 model3d)
  → set active character localStorage
  → grudgewarlords.com|/play.*/airship|home-island|play|tutorial?characterId=&from=gcs
```
- **`returnTo` must never** point at `character.*` or grudge6 lab hosts.  
- Prefer **`https://grudgewarlords.com`** or **`play.grudgewarlords.com`** in `returnTo` (not studio portal).

### C. Session play loop (in-world)
```
Select active UUID
  → home-island (base, harvest, build)
  → world-map → sector play (haven_shore default)
  → optional tutorial shipwreck
  → multiplayer Colyseus rooms (Railway)
```
- Active character UUID must belong to signed-in account.  
- Island / bag / progress = Railway.

### D. Craft loop (parallel surface)
```
grudge-crafting.puter.site
  → guest: browse recipes/codex only (profession levels = blank)
  → sign in Grudge ID → pick hero
  → craft: bag account-scope · profession XP character-scope
```
- Crafting **never** replaces Foundry for create.  
- Fake “Lv 1” without a hero is a bug (fixed 5.11.1+).

### E. Editor / fleet tools (not player journey)
| Tool | Host | Feeds |
|------|------|--------|
| Forge | forge.grudge-studio.com | Scenes / maps → CDN |
| UI editor | ui.grudge-studio.com | HUD packs |
| Open launcher | open.grudge-studio.com | Catalog of games |

---

## 4. Handoff query contract

| Param | Meaning |
|-------|---------|
| `characterId` | Railway character UUID (preferred over stale localStorage) |
| `from=gcs` | Came from Foundry; allow skip of false create gates |
| `returnTo` / `return_uri` | After create, where to land (must be client/warlords play host) |
| `era=warlords` | Roster / create filter |
| `mode=create` | Force Foundry create once; strip after handoff |
| `sso_token` / `token` | Session JWT handoff (prefer hash) |
| `skipIntro=1` | Ops/play land-in without storm intro |

### Deep-link examples (production)

```
# Foundry create → Warlords play zone
https://character.grudge-studio.com/foundry?era=warlords&returnTo=https%3A%2F%2Fgrudgewarlords.com%2Fairship

# Enter zone with hero (apex live today)
https://grudgewarlords.com/play?mode=zone&sector=haven_shore&worldSeed=grudge-world-1&skipIntro=1&characterId={uuid}

# Preferred brand host after DNS
https://play.grudgewarlords.com/home-island?characterId={uuid}&from=gcs

# Pretty hosts (after DNS + redirects)
https://airship.grudgewarlords.com/?characterId={uuid}&from=gcs
https://home.grudgewarlords.com/?characterId={uuid}
https://map.grudgewarlords.com/

# Craft suite (Warlords product domain)
https://grudgewarlords.com/craft/
# alias: https://grudgewarlords.com/wcs/
# legacy redirect: https://grudge-crafting.puter.site/ → /craft/
```

---

## 5. Anti-patterns (reject in review)

| Wrong | Right |
|-------|--------|
| Play URL on `character.grudge-studio.com/viewer` as product home | Foundry create → **client** play |
| Login UI on `grudge-studio.com` apex as SSOT | **id.grudge-studio.com** |
| Treat `grudgewarlords.com` and `client.*` as different rosters | Same SPA / same Railway |
| Crafting creates new heroes as SSOT | Foundry/Warlords create; craft **selects** |
| `returnTo` back to Foundry forever | `returnTo` → client path once |
| Bare `/play` without character (create loop) | `characterId` or Foundry gate with strip |
| Home island “level 20 only” in new docs | Min level **1** after first hero |
| D1 / Puter KV as character SSOT | Railway only |

---

## 6. Code pointers

| Concern | Path |
|---------|------|
| Ordered happy path steps | `shared/definitions/warlordsProductionFlow.ts` |
| Fleet URLs | `shared/fleet/manifest.ts` (`FLEET_URLS`) |
| Warlords → Foundry | `client/src/lib/gcsRedirect.ts` |
| Foundry → client | character-viewer `studioLinks.ts` · `launchToGame.ts` · `returnTo.ts` |
| Crafting fleet bridge | `client/public/grudge-fleet.js` |
| Identity law | [CANONICAL_IDENTITY.md](./CANONICAL_IDENTITY.md) |
| Happy path (short) | [HAPPY_PATH.md](./HAPPY_PATH.md) |
| Foundry product skill | `~/.agents/skills/grudge-foundry` |

---

## 7. Agent checklist

```
[ ] New play link uses client.grudge-studio.com (or grudgewarlords.com as same SPA)
[ ] New create link uses character.grudge-studio.com/foundry
[ ] New login uses id.grudge-studio.com?redirect_uri=
[ ] returnTo is never character.* / grudge6 lab
[ ] Crafting only selects heroes; Foundry creates
[ ] Progress writes go to Railway with character UUID
[ ] Docs that say “L20 home island gate” are updated or marked legacy
```
