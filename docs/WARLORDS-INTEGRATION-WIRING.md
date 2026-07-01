# Warlords Integration Wiring

How **WCS**, **Grudge ID accounts**, **Puter GS app**, **home islands**, and **ObjectStore** connect.

Machine-readable map: [ObjectStore `warlords-integration-wiring.json`](https://molochdagod.github.io/ObjectStore/api/v1/_meta/warlords-integration-wiring.json)

---

## Auth & accounts

| Step | Where |
|------|--------|
| Sign in | `id.grudge-studio.com` or Puter `puter.auth.signIn()` |
| Game JWT | Railway `grudge-api-production` — characters, island, inventory |
| Puter bridge | `POST /api/auth/puter` |
| WCS return | `POST /api/auth/popup-token` → `?grudge_token=` on return URL |
| Cross-app | `POST /api/auth/grudge-bridge` |

**Puter GS app** (`dist-puter/grudge-fleet.js`):

- `GAME_DATA` → Railway (not legacy builder URL)
- `signIn()` → Puter → Railway account
- `getHomeIsland()` / `saveHomeIslandState()` → island SSOT
- `getGamesLibrary()` → ObjectStore runtime index

---

## WCS ↔ Warlords

`WcsRedirect` sends users to `wcs.grudge-studio.com` with:

```
return=https://grudgewarlords.com/home?grudge_token=<launch>
```

WCS completes character/arsenal flow and redirects back; Warlords bridges the token to the same Railway account.

---

## Home island (physical scale + seed)

Contract: [home-island-contract.json](https://molochdagod.github.io/ObjectStore/api/v1/home-island-contract.json)

| Surface | Size | Role |
|---------|------|------|
| Warlords 3D | **1024m** | `Island3DEngine`, textures, mountain triad GLB |
| RTS export | **200m** | `IslandGenerator` + `NatureScatter` (visual) |
| Logical map | 100×100% | Server zone generation |

**Save order (fixed):**

1. `PATCH /api/island/state` — Railway `home_islands.state`
2. `grudge:island:{id}:state` — Puter KV cache
3. `localStorage` — offline

**Seed:** `home_islands.seed` + `generateMountainTriadSeed()` — deterministic dungeon peak, triad placement, zone types.

**RTS → Warlords:** `POST /api/island/export-from-rts` merges heightmap; trees from NatureScatter stay in RTS until GLB export pipeline exists.

---

## ObjectStore (items & economy)

Puter app and Warlords load:

```
GET /api/v1/games-library.json
GET /api/v1/canonical-items-manifest.json
```

Weapons/tools runtime = `master-weapon-prefabs.json`. Materials/recipes/nodes = `master-materials.json`, `master-recipes.json`, `master-harvest-nodes.json`.

---

## Remaining gaps

1. **NatureScatter → 3D** — export foliage placements with RTS heightmap
2. **Scale alignment** — Colyseus 400m room vs 1024m 3D (document offsets in contract)
3. **Economy spider chart** — materials/recipes/nodes/chest achievability viz (not built)
4. **Armor prefabs** — catalog only; runtime prefab pipeline planned

---

## Verify wiring

```bash
# GrudgeBuilder
npm run smoke:grudge-bridge   # auth bridge
npm run smoke:puter-sso       # Puter → Railway

# ObjectStore
npm run build:items-pipeline
```