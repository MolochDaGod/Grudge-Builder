# Production Map Package — Grudge Open World

## Where is the map asset?

| Role | Path |
|------|------|
| **Live geometry (today)** | `https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.gltf` + `scene.bin` (~127MB) + `textures/` |
| **Local geometry** | `public/models/lobby/pirate-islands/` |
| **Preferred single-file mesh** | `…/pirate-islands/scene.glb` (build with script; 404 until uploaded) |
| **Full production package** | `public/maps/grudge-open-world/grudge-open-world.gmap.json` |
| **Forge import** | `public/maps/grudge-open-world/grudge-open-world.studio.json` |
| **SSOT (code)** | `shared/definitions/productionMapPackage.ts` |
| **Editor** | https://forge.grudge-studio.com/ |

## Best file type for forge.grudge-studio.com

| Need | Format | Why |
|------|--------|-----|
| Mesh / materials / textures | **`.glb`** | Single file; Forge model converter + viewer |
| Terrain sculpt / entity place | **`.studio.json`** | Forge MapProject (current editor native) |
| Full production: scripts, AI, network, missions, items, physics refs | **`.gmap.json`** | Layers + scriptable entities + system flags |

**Do not put scripts/AI/missions inside a monome GLB.** GLB is geometry only. Gameplay lives in the package JSON layers so agents and Forge can edit without re-exporting 130MB meshes.

## What’s inside the `.gmap`

- **Geometry refs** — gltf (live) + glb (preferred) + optional colliders/navmesh
- **Layers** — ocean → island → structure → nature → living → vehicle → physics → rts → ai → network → missions → items → characters
- **Entities** — faction islands, captains on mounts, travelers, boats, capture flags, multipacks
- **AI brains** — sailing, combat, ships, auto-harvest, RTS capture, captains, civilians
- **Network manager** — room id, tick, interest, sync flags, endpoints
- **Missions** — starter dock, claim south, faction blacksmith
- **Character prefabs** — 6 races + mounts + equipment slots
- **Items/weapons catalog refs** — ObjectStore + shared definitions
- **Systems flags** — RTS flags, AI sailing/combat/ships, harvest units, account equipment, faction islands, boat physics, day/night

## Build commands

```bash
# 1) Rebuild package JSON from SSOT
npx tsx scripts/build-grudge-open-world-gmap.ts

# 2) (Optional) Convert pirate-islands → scene.glb for Forge mesh tools
node scripts/convert-pirate-islands-glb.mjs --download
# then upload scene.glb to R2 under models/lobby/pirate-islands/
```

## Open in Forge

1. Open https://forge.grudge-studio.com/
2. **Import** `public/maps/grudge-open-world/grudge-open-world.studio.json`
3. Entities appear in the outliner with `data.scriptableKind`, layers, AI brains under `grudgeProduction`
4. Mesh base: load geometry URL from `grudgeProduction.geometry.gltfPath` (or `.glbPath` when live)

## Game clock & tides

| Unit | Real time |
|------|-----------|
| 1 game day | 6 hours |
| 1 game week (8 days) | 48 hours (= 2 real days) |
| Tide high→high | 3 real hours (2× per game day) |
| Tide mean Y | −0.85 m |
| Tide amplitude | ±0.22 m (~0.44 m peak-to-peak) |

SSOT: `shared/definitions/gameClock.ts`  
Sky uses wall-clock `getGameTimeOfDay`; events still schedule on real UTC.

## Runtime (production deployed)

```
Island3DEngine mode=lobby
  → load pirate-islands scene.gltf (CDN)
  → MapCompositionLoader + FactionIslandGenerator
  → LobbyGameplay capture flags + ships
  → play systems (harvest, camps, character, equipment)
```

Entry: `/island-3d?mode=lobby&map=pirate-islands&island=grudge-open-world`

## Agent access

- Skill: `client/src/island3d/skills/production-map/SKILL.md`
- Brief: `public/maps/grudge-open-world/AGENT_BRIEF.md`
- Import: `@shared/definitions/productionMapPackage` → `GRUDGE_OPEN_WORLD_GMAP`
