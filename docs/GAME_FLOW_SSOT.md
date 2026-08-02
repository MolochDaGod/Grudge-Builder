# Game flow SSOT — hosts, loops, and handoffs

**Status:** LAW for product + agents (2026-08).  
**Code SSOT:** `shared/definitions/warlordsProductionFlow.ts` · Foundry skill · this doc.  
**Do not invent** parallel create/play hosts.

---

## 1. Host roles (stop confusing these)

| Host | Role | Is it “the game”? |
|------|------|-------------------|
| **`id.grudge-studio.com`** | **Login only** — mint JWT, SSO return | No |
| **`character.grudge-studio.com`** | **Foundry** — create hero + 4-slot My Heroes hub | No play runtime |
| **`client.grudge-studio.com`** | **Canonical 3D play runtime** (Island3D, home-island, play, tutorial, airship) | **Yes — play** |
| **`grudgewarlords.com`** | **Same Vercel SPA** as client (product / legacy domain alias) | **Yes — same build** |
| **`grudge.studio`** | Product apex / marketing shell (fleet manifest `warlords`) | Entry, not Foundry |
| **`grudge-studio.com`** | Studio **portal / marketing** (Rec0deD). **Not** login. **Not** play SSOT | No |
| **`grudge-crafting.puter.site`** | Craft / professions UI (shared bag, per-char XP) | No 3D world |
| **`forge.grudge-studio.com`** | Map / scene editor | No player progress |
| **`info.grudge-studio.com`** | Definitions + ops WORLD_MAP | Not play |
| **`assets.grudge-studio.com`** | R2 binaries | Not play |
| **`objectstore` / info `/api/v1`** | Recipe / item JSON | Not player state |

### One-line rules

1. **Login** → always `id.grudge-studio.com` (never apex, never character.*, never client login page as identity).  
2. **Create hero** → always `character.grudge-studio.com/foundry` (or Warlords `/create-character` redirect).  
3. **Play 3D** → always `client.grudge-studio.com{path}` with `characterId` (or same path on `grudgewarlords.com` — **same deploy**).  
4. **Craft** → `grudge-crafting.puter.site` selects an existing hero; **does not create** heroes.  
5. **Player state** → Railway Postgres only (not D1, not Puter KV as SSOT).

### `client.*` vs `grudgewarlords.com`

| | |
|--|--|
| **Truth** | Both host the **GrudgeBuilder** client SPA (Vercel). |
| **Prefer in new links** | `https://client.grudge-studio.com` for play handoffs (Foundry skill + happy path). |
| **OK** | `https://grudgewarlords.com` as marketing + legacy play URLs (same routes). |
| **Never** | Treat them as two different game servers or two rosters. |

### `character.*` vs `client.*`

| | `character.*` | `client.*` |
|--|---------------|------------|
| Create race/class | **Yes** (`/foundry`) | Redirects to Foundry |
| 4-slot pick | **Yes** (`/`) | Optional account UI only |
| Home island / zones / tutorial | **No** | **Yes** |
| Stay after create | **No** — hand off | **Yes** — land with `?characterId=&from=gcs` |

### `grudge-studio.com` vs `grudgewarlords.com`

| | `grudge-studio.com` | `grudgewarlords.com` / `client.*` |
|--|---------------------|-------------------------------------|
| Portal / studio marketing | Yes | No (game product) |
| Login UI | No → use **id.*** | No → use **id.*** |
| Warlords 3D play | No | Yes |

---

## 2. Canonical player journey (happy path)

Code: `WARLORDS_PRODUCTION_FLOW` in `shared/definitions/warlordsProductionFlow.ts`.

```
┌─────────────┐     ┌──────────────────────────┐     ┌─────────────────────────────┐
│ Sign in     │────►│ Create or pick hero      │────►│ Live play (client runtime)  │
│ id.*        │     │ character.*/foundry  or  │     │ /airship → /home-island     │
│             │     │ character.*/ (4-slot)    │     │ → /world-map · /play zones  │
└─────────────┘     └──────────────────────────┘     │ (tutorial optional)         │
                                                      └──────────────┬──────────────┘
                                                                     │
                        ┌────────────────────────────────────────────┤
                        ▼                                            ▼
              ┌─────────────────────┐                    ┌───────────────────────┐
              │ Craft UI (Puter)    │                    │ Open world / MP       │
              │ grudge-crafting.*   │                    │ /play?mode=zone&…     │
              │ bag = account       │                    │ Colyseus Railway      │
              │ XP = character      │                    └───────────────────────┘
              └─────────────────────┘
```

### Step table

| Step | Where | Needs auth | Needs character |
|------|--------|------------|-----------------|
| Opening / intro (optional) | client `/intro` or product landing | No | No |
| Sign in | **id.*** → return to origin | — | — |
| Create hero | **character.*** `/foundry` | Yes | No |
| My Heroes (≤4) | **character.*** `/` | Yes | Pick one |
| Airship handoff | **client.*** `/airship?characterId=&from=gcs` | Yes | Yes |
| Home island | **client.*** `/home-island` | Yes | Yes — **no level-20 gate** (SSOT min level 1) |
| World map | **client.*** `/world-map` | Yes | Yes |
| Open zone | **client.*** `/play?mode=zone&sector=…` | Yes | Yes |
| Tutorial | **client.*** `/tutorial` | Yes | Yes — **optional** |
| Craft | **grudge-crafting.puter.site** | Browse free; craft needs auth + hero | Yes for XP |

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
  → character.grudge-studio.com/foundry?era=warlords&returnTo=https://client.grudge-studio.com/...
  → POST Railway /api/characters (gameEra=warlords, grudge6 model3d)
  → set active character localStorage
  → client.grudge-studio.com/airship|home-island|play|tutorial?characterId=&from=gcs
```
- **`returnTo` must never** point at `character.*` or grudge6 lab hosts.  
- Prefer **`client.grudge-studio.com`** in `returnTo` (grudgewarlords.com also OK as alias).

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
# Foundry create then home island
https://character.grudge-studio.com/foundry?era=warlords&returnTo=https%3A%2F%2Fclient.grudge-studio.com%2Fhome-island

# Enter zone with hero
https://client.grudge-studio.com/play?mode=zone&sector=haven_shore&worldSeed=grudge-world-1&skipIntro=1&characterId={uuid}

# Same SPA on product domain
https://grudgewarlords.com/home-island?characterId={uuid}&from=gcs

# Craft (select hero in UI)
https://grudge-crafting.puter.site/
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
