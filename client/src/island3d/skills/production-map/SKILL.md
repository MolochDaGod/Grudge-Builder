---
name: production-map
description: >
  Locate and edit the production pirate open-world map for Forge + agents:
  geometry (pirate-islands GLTF/GLB), full .gmap package (layers, NPCs, AI, network,
  missions, items, boats, RTS flags), and forge.grudge-studio.com import.
---

# Production Map — Grudge Open World

## Where is the asset?

| What | Where |
|------|--------|
| **Live mesh** | `https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.gltf` (+ bin ~127MB) |
| **Local mesh** | `public/models/lobby/pirate-islands/` |
| **Preferred Forge mesh** | `…/scene.glb` (build with `node scripts/convert-pirate-islands-glb.mjs`) |
| **Full production package** | `public/maps/grudge-open-world/grudge-open-world.gmap.json` |
| **Forge project import** | `public/maps/grudge-open-world/grudge-open-world.studio.json` |
| **SSOT** | `shared/definitions/productionMapPackage.ts` |
| **Editor** | https://forge.grudge-studio.com/ |

## Best file type

- **Geometry only** → `.glb`
- **Full map (scripts, AI, network, missions, items)** → `.gmap.json`
- **Forge UI native** → `.studio.json` (exported from gmap)

Never try to bake scripts/AI into a monome GLB.

## Rebuild package

```bash
npx tsx scripts/build-grudge-open-world-gmap.ts
```

## Layers (agent-editable)

ocean_floor → ocean → island_base → beach → structure → prop → nature → camp → living → vehicle → nav → physics → rts → ai → network → missions → items → characters → systems → vfx

## Systems flags

RTS capture flags · AI sailing · AI combat · AI ships · auto-harvest units · character account/equipment · faction islands · boat physics · day/night

## Runtime entry

`/island-3d?mode=lobby&map=pirate-islands&island=grudge-open-world`

Docs: `docs/PRODUCTION_MAP_GMAP.md`
